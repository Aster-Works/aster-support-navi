/**
 * 【非常用・legacy】敵対検証Workflow が出した flagged 配列を app/data/programs.ts に適用する。
 *
 * 現在の正式な制度更新経路は DB / 管理画面 CSV import。app/data/programs.ts は
 * 緊急退避・ローカル初期データ用の seed であり、通常運用では直接変更しない。
 * --write は ALLOW_SEED_WRITE=1 が無い限り停止する。
 *
 * flagged 配列: {slug, issue, note, suggestedTitle?}
 *   - issue=scope かつ suggestedTitle あり → その制度の title を suggestedTitle に置換（公開維持）。
 *   - それ以外（identity / unreachable / assertion、または suggestedTitle 無しの scope）→ published→draft へ降格。
 *
 *   npx tsx scripts/apply-verify-fixes.ts <flagged.json> [--write]
 * --write 無しは dry-run（何件どう変えるか表示のみ）。
 */
import { readFileSync, writeFileSync } from "node:fs";

const inputPath = process.argv[2];
const write = process.argv.includes("--write");
if (!inputPath) throw new Error("usage: tsx apply-verify-fixes.ts <flagged.json> [--write]");
if (write && process.env.ALLOW_SEED_WRITE !== "1") {
  throw new Error(
    "apply-verify-fixes.ts の --write は停止中です。制度修正はDB/管理画面/CSV取込で行ってください。" +
      "緊急退避として seed を編集する場合のみ ALLOW_SEED_WRITE=1 を明示してください。",
  );
}

interface Flag {
  slug: string;
  issue: string;
  note?: string;
  suggestedTitle?: string;
}
const raw = JSON.parse(readFileSync(inputPath, "utf8"));
const flagged: Flag[] = Array.isArray(raw) ? raw : raw.flagged ?? [];

const path = "app/data/programs.ts";
let text = readFileSync(path, "utf8");
const jstr = (s: string) => JSON.stringify(s); // 正しくエスケープ

const report: string[] = [];
let titleFixed = 0;
let demoted = 0;
let notFound = 0;

for (const f of flagged) {
  // その slug の制度ブロックを取得（id 行から次の "\n  }," まで）
  const blockRe = new RegExp(
    "(\\n  \\{\\n    id: " + escapeRe(jstr(f.slug)) + ",[\\s\\S]*?\\n  \\},)",
  );
  const m = text.match(blockRe);
  if (!m) {
    notFound++;
    report.push(`NOTFOUND ${f.slug}`);
    continue;
  }
  const block = m[1];
  let next = block;
  const useTitle = f.issue === "scope" && f.suggestedTitle && f.suggestedTitle.trim().length > 0;
  if (useTitle) {
    next = next.replace(
      /(\n    title: )"(?:[^"\\]|\\.)*"/,
      (_full, p1) => p1 + jstr(f.suggestedTitle!.trim()),
    );
    titleFixed++;
    report.push(`TITLE  ${f.slug}\n   → ${f.suggestedTitle!.trim()}`);
  } else {
    if (next.includes('status: "published"')) {
      next = next.replace('status: "published"', 'status: "draft"');
      demoted++;
      report.push(`DRAFT  ${f.slug}  [${f.issue}] ${f.note ?? ""}`);
    } else {
      report.push(`SKIP(not published) ${f.slug}`);
    }
  }
  text = text.replace(block, next);
}

console.log(`flagged=${flagged.length} / titleFix=${titleFixed} / demote=${demoted} / notFound=${notFound}`);
report.forEach((r) => console.log("  " + r));
if (write) {
  writeFileSync(path, text, "utf8");
  console.log("\nWROTE app/data/programs.ts");
} else {
  console.log("\n(dry-run。--write で適用)");
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
