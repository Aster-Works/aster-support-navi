/**
 * Workflow が出力した制度JSON → app/data/programs.ts へ追記する TS オブジェクトを生成・挿入する。
 *
 *   npx tsx scripts/gen-append-programs.ts <programs.json> <fixedCategorySlug>
 *
 * 安全ゲート（公開=published に残す条件。外れたら draft へ降格・ログ）:
 *   - officialUrl が https かつ許可ホスト（lg.jp/go.jp/tokyo.jp/shakyo/syakyo/cosw/city.*）
 *   - 全 TEXT フィールドに FORBIDDEN_PHRASES が無い
 *   - targetPeople と (applicationMethodText|contactName|contactUrl) が揃う（isPublishable）
 *   - slug 一意（既存・バッチ内で重複は skip）
 * uncertainFields は humanizeUncertain が解釈できる正準キーへ寄せる。
 * このスクリプトは programs.ts を編集するだけ。DB へは書かない（別途 export-seed-to-sql）。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { programs as existing } from "@/app/data/programs";
import { findForbiddenPhrases } from "@/app/lib/copy";

const CHECK_DATE = "2026-06-21";
const inputPath = process.argv[2];
const fixedCategory = process.argv[3] ?? "livelihood";
if (!inputPath) throw new Error("usage: tsx gen-append-programs.ts <json> <category>");

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

const raw: { programs: InProgram[] } = JSON.parse(readFileSync(inputPath, "utf8"));
const existingSlugs = new Set(existing.map((p) => p.slug));
const validLifeEvents = new Set([
  "birth", "childcare", "moving", "nursery", "school",
  "single-parent", "hardship", "caregiving", "housing", "disability",
]);

// 公式ながら標準パターンに当たらない社会福祉協議会(社協)等の検証済みホスト（WebFetchで実在確認済み）。
const EXTRA_ALLOWED_HOSTS = new Set<string>([
  "csw-kawasaki.or.jp", // 川崎市社会福祉協議会（生活福祉資金）
  "www.with-kobe.or.jp", // 神戸市社会福祉協議会（生活福祉資金）
  "www.kumamoto-city-csw.or.jp", // 熊本市社会福祉協議会（生活福祉資金）
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

const canonMap: [RegExp, string][] = [
  [/benefitamount/i, "benefitAmountText"],
  [/requireddocument/i, "requiredDocumentsText"],
  [/applicationdeadline|deadline/i, "applicationDeadlineText"],
  [/applicationmethod/i, "applicationMethodText"],
  [/targetpeople/i, "targetPeople"],
  [/contactname/i, "contactName"],
  [/contactphone/i, "contactPhone"],
];
const canonUncertain = (arr: string[]): string[] =>
  (arr ?? []).map((u) => {
    for (const [re, key] of canonMap) if (re.test(u)) return key;
    return u;
  });

const lit = (v: string): string => JSON.stringify(v);
const seen = new Set<string>();
const blocks: string[] = [];
const report = { published: 0, draft: 0, skippedDup: 0, demoted: [] as string[], dropped: [] as string[] };

for (const p of raw.programs) {
  if (!p.slug || existingSlugs.has(p.slug) || seen.has(p.slug)) {
    report.skippedDup++;
    continue;
  }
  // 最低限の妥当性（無ければ採用しない）
  if (!p.officialUrl?.startsWith("https://") || !p.targetPeople || !(p.applicationMethodText || p.contactName || p.contactUrl)) {
    report.dropped.push(`${p.slug}: 必須欠落`);
    continue;
  }
  seen.add(p.slug);

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
    report.demoted.push(`${p.slug}: ${!hostOk ? "host不許可 " : ""}${forbidden.length ? "禁止語:" + forbidden.join(",") : ""}`);
  }
  if (status === "published") report.published++;
  else report.draft++;

  const lifeEvents = (p.lifeEventSlugs ?? []).filter((s) => validLifeEvents.has(s));
  if (lifeEvents.length === 0) lifeEvents.push("hardship");

  const L: string[] = [];
  L.push("  {");
  L.push(`    id: ${lit(p.slug)},`);
  L.push(`    slug: ${lit(p.slug)},`);
  L.push(`    prefectureSlug: ${lit(p.prefectureSlug)},`);
  L.push(`    municipalitySlug: ${lit(p.municipalitySlug)},`);
  L.push(`    title: ${lit(p.title)},`);
  L.push(`    summary: ${lit(p.summary)},`);
  if (p.plainLanguageSummary) L.push(`    plainLanguageSummary: ${lit(p.plainLanguageSummary)},`);
  L.push(`    categorySlugs: [${lit(fixedCategory)}],`);
  L.push(`    lifeEventSlugs: [${lifeEvents.map(lit).join(", ")}],`);
  L.push(`    benefitType: ${lit(p.benefitType)},`);
  L.push(`    targetPeople: ${lit(p.targetPeople)},`);
  if (p.benefitAmountText) L.push(`    benefitAmountText: ${lit(p.benefitAmountText)},`);
  if (p.applicationDeadlineText) L.push(`    applicationDeadlineText: ${lit(p.applicationDeadlineText)},`);
  L.push(`    applicationMethodText: ${lit(p.applicationMethodText)},`);
  if (p.requiredDocumentsText) L.push(`    requiredDocumentsText: ${lit(p.requiredDocumentsText)},`);
  if (typeof p.onlineApplicationAvailable === "boolean") L.push(`    onlineApplicationAvailable: ${p.onlineApplicationAvailable},`);
  if (p.contactName) L.push(`    contactName: ${lit(p.contactName)},`);
  if (p.contactPhone) L.push(`    contactPhone: ${lit(p.contactPhone)},`);
  if (p.contactUrl) L.push(`    contactUrl: ${lit(p.contactUrl)},`);
  L.push(`    officialUrl: ${lit(p.officialUrl)},`);
  if (p.officialSourceTitle) L.push(`    officialSourceTitle: ${lit(p.officialSourceTitle)},`);
  L.push(`    lastOfficialCheckedAt: ${lit(CHECK_DATE)},`);
  L.push(`    sourceConfidence: ${lit(p.sourceConfidence)},`);
  const uf = canonUncertain(p.uncertainFields);
  if (uf.length) L.push(`    uncertainFields: [${uf.map(lit).join(", ")}],`);
  if (p.disclaimerNote) L.push(`    disclaimerNote: ${lit(p.disclaimerNote)},`);
  L.push(`    status: ${lit(status)},`);
  L.push(`    updatedAt: ${lit(CHECK_DATE)},`);
  L.push("  },");
  blocks.push(L.join("\n"));
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const programsPath = resolve(__dirname, "../app/data/programs.ts");
const src = readFileSync(programsPath, "utf8");
const marker = "\n];\n";
const idx = src.lastIndexOf(marker);
if (idx < 0) throw new Error("programs.ts の終端 '];' が見つからない");
const next = src.slice(0, idx) + "\n" + blocks.join("\n") + src.slice(idx);
writeFileSync(programsPath, next, "utf8");

console.log(JSON.stringify({ ...report, totalAppended: blocks.length }, null, 2));
