/**
 * 型付き seed の品質ゲート監査（読み取り専用）。
 *
 * 使い方:
 *   npx tsx scripts/audit-content-quality.ts
 *   npx tsx scripts/audit-content-quality.ts --write docs/content-quality-audit.latest.json
 *
 * 安全:
 *   - DB へは接続しない。
 *   - seed ファイルも書き換えない。
 *   - --write のときだけ JSON レポートを書き出す。
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { programs } from "@/app/data/programs";
import {
  evaluateProgramQuality,
  type QualityIssue,
} from "@/app/lib/data/quality";
import { getTodayIso } from "@/app/lib/now";

interface AuditItem {
  slug: string;
  title: string;
  status: string;
  officialUrl: string;
  lastOfficialCheckedAt: string;
  sourceConfidence: string;
  issues: QualityIssue[];
}

function argValue(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

function countBy<T extends string>(values: T[]): Record<T, number> {
  return values.reduce(
    (acc, v) => {
      acc[v] = (acc[v] ?? 0) + 1;
      return acc;
    },
    {} as Record<T, number>,
  );
}

const todayIso = argValue("--today") ?? getTodayIso();
const writePath = argValue("--write");

const items: AuditItem[] = programs
  .map((p) => ({
    slug: p.slug,
    title: p.title,
    status: p.status,
    officialUrl: p.officialUrl,
    lastOfficialCheckedAt: p.lastOfficialCheckedAt,
    sourceConfidence: p.sourceConfidence,
    issues: evaluateProgramQuality(p, { todayIso }),
  }))
  .filter((item) => item.issues.length > 0);

const issueCodes = items.flatMap((item) => item.issues.map((i) => i.code));
const blockingItems = items.filter((item) =>
  item.issues.some((i) => i.blocksPublish),
);
const queueItems = items.filter((item) =>
  item.issues.some((i) => i.shouldQueue),
);

const payload = {
  generatedAt: new Date().toISOString(),
  todayIso,
  totalPrograms: programs.length,
  statusCounts: countBy(programs.map((p) => p.status)),
  issueItemCount: items.length,
  blockingItemCount: blockingItems.length,
  queueItemCount: queueItems.length,
  issueCounts: countBy(issueCodes),
  items,
};

console.log(
  [
    `監査日: ${todayIso}`,
    `制度数: ${payload.totalPrograms}`,
    `ステータス: ${JSON.stringify(payload.statusCounts)}`,
    `品質issueあり: ${payload.issueItemCount}`,
    `公開ブロッカーあり: ${payload.blockingItemCount}`,
    `review queue候補: ${payload.queueItemCount}`,
    `issue別: ${JSON.stringify(payload.issueCounts)}`,
  ].join("\n"),
);

if (writePath) {
  const abs = resolve(process.cwd(), writePath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`書き出し: ${abs}`);
}
