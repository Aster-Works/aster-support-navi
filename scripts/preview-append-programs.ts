/**
 * 生成された制度JSON（{ programs: [...] }）を programs.ts に追記する「前」に、
 * 読み取り専用で品質を監査する。何も書き換えない。gen-append-programs.ts と同じ安全ゲートを再現し、
 * 公開（published）に残る件数・draft降格理由・slug衝突・公式ホスト分布・officialUrl一覧を出す。
 *
 *   npx tsx scripts/preview-append-programs.ts <programs.json> [fixedCategorySlug]
 */
import { readFileSync } from "node:fs";
import { programs as existing } from "@/app/data/programs";
import { findForbiddenPhrases } from "@/app/lib/copy";

const inputPath = process.argv[2];
const fixedCategory = process.argv[3] ?? "(per-file)";
if (!inputPath) throw new Error("usage: tsx preview-append-programs.ts <json> [category]");

interface InProgram {
  slug: string;
  municipalitySlug: string;
  prefectureSlug: string;
  title: string;
  summary: string;
  plainLanguageSummary?: string;
  lifeEventSlugs: string[];
  benefitType: string;
  targetPeople: string;
  benefitAmountText?: string;
  applicationDeadlineText?: string;
  applicationMethodText: string;
  requiredDocumentsText?: string;
  onlineApplicationAvailable?: boolean;
  contactName?: string;
  contactPhone?: string;
  contactUrl?: string;
  officialUrl: string;
  officialSourceTitle?: string;
  sourceConfidence: string;
  uncertainFields: string[];
  disclaimerNote?: string;
  publishable?: boolean;
  verifyNote?: string;
}

const EXTRA_ALLOWED_HOSTS = new Set<string>([
  "csw-kawasaki.or.jp",
  "www.with-kobe.or.jp",
  "www.kumamoto-city-csw.or.jp",
  "www.heartful-volunteer.net",
  "www.himeji-wel.or.jp",
]);

const allowedHost = (url: string): boolean => {
  try {
    const h = new URL(url).host;
    return (
      EXTRA_ALLOWED_HOSTS.has(h) ||
      h.endsWith(".lg.jp") || h.endsWith(".go.jp") || h.endsWith(".tokyo.jp") ||
      h.includes("shakyo") || h.includes("syakyo") || h.includes("cosw") ||
      h.startsWith("city.") || h.includes(".city.")
    );
  } catch {
    return false;
  }
};

const raw: { programs: InProgram[] } = JSON.parse(readFileSync(inputPath, "utf8"));
const existingSlugs = new Set(existing.map((p) => p.slug));
const seen = new Set<string>();

let willPublish = 0, willDraft = 0, dropped = 0, dupSkip = 0;
const demotions: string[] = [];
const drops: string[] = [];
const hostCount: Record<string, number> = {};
const urls: string[] = [];
const byCity: Record<string, { pub: number; draft: number }> = {};

for (const p of raw.programs) {
  if (!p.slug || existingSlugs.has(p.slug) || seen.has(p.slug)) {
    dupSkip++;
    if (p.slug && existingSlugs.has(p.slug)) drops.push(`DUP-EXISTING ${p.slug}`);
    continue;
  }
  if (!p.officialUrl?.startsWith("https://") || !p.targetPeople || !(p.applicationMethodText || p.contactName || p.contactUrl)) {
    dropped++;
    drops.push(`DROP ${p.slug}: 必須欠落 (url=${!!p.officialUrl} target=${!!p.targetPeople} method=${!!p.applicationMethodText})`);
    continue;
  }
  seen.add(p.slug);

  let host = "?";
  try { host = new URL(p.officialUrl).host; } catch { /* */ }
  hostCount[host] = (hostCount[host] ?? 0) + 1;
  urls.push(`${p.publishable ? "P" : "d"}  ${p.slug}\n     ${p.officialUrl}`);

  const textFields = [
    p.title, p.summary, p.plainLanguageSummary ?? "", p.targetPeople,
    p.benefitAmountText ?? "", p.applicationDeadlineText ?? "", p.applicationMethodText,
    p.requiredDocumentsText ?? "", p.contactName ?? "", p.disclaimerNote ?? "",
  ].join(" \n ");
  const forbidden = findForbiddenPhrases(textFields);
  const hostOk = allowedHost(p.officialUrl);

  let status: "published" | "draft" = p.publishable ? "published" : "draft";
  if (status === "published" && (!hostOk || forbidden.length > 0)) {
    status = "draft";
    demotions.push(`${p.slug}: ${!hostOk ? `host不許可(${host}) ` : ""}${forbidden.length ? "禁止語:" + forbidden.join(",") : ""}`);
  }
  const cityKey = `${p.prefectureSlug}/${p.municipalitySlug}`;
  byCity[cityKey] = byCity[cityKey] ?? { pub: 0, draft: 0 };
  if (status === "published") { willPublish++; byCity[cityKey].pub++; } else { willDraft++; byCity[cityKey].draft++; }
}

console.log(`\n=== PREVIEW: ${inputPath}  (category=${fixedCategory}) ===`);
console.log(`入力 ${raw.programs.length}件 → 追記 ${seen.size}件 / published ${willPublish} / draft ${willDraft} / dup-skip ${dupSkip} / dropped ${dropped}`);
console.log(`\n--- 公式ホスト分布 ---`);
for (const [h, n] of Object.entries(hostCount).sort((a, b) => b[1] - a[1])) console.log(`  ${n.toString().padStart(3)}  ${h}`);
console.log(`\n--- draft降格 (${demotions.length}) ---`);
demotions.forEach((d) => console.log(`  ${d}`));
console.log(`\n--- drop/dup (${drops.length}) ---`);
drops.forEach((d) => console.log(`  ${d}`));
console.log(`\n--- 市別 published/draft ---`);
for (const [c, v] of Object.entries(byCity).sort()) console.log(`  ${c}: P${v.pub} d${v.draft}`);
console.log(`\n--- officialUrl 一覧（P=published d=draft）---`);
urls.forEach((u) => console.log("  " + u));
