import type {
  PublishStatus,
  SourceConfidence,
  SupportProgram,
} from "./types";
import { getTodayIso } from "@/app/lib/now";

export const SOURCE_REVIEW_STALE_DAYS = 90;
export const SOURCE_REVIEW_WATCH_DAYS = 60;

const EXTRA_ALLOWED_HOSTS = new Set<string>([
  "csw-kawasaki.or.jp",
  "www.with-kobe.or.jp",
  "www.kumamoto-city-csw.or.jp",
  "www.heartful-volunteer.net",
  "www.himeji-wel.or.jp",
  "www.dondon-net.or.jp",
  "www.matsuyama-wel.jp",
]);

export type QualityIssueCode =
  | "missing_official_url"
  | "invalid_official_url"
  | "non_https_official_url"
  | "unofficial_source_host"
  | "missing_last_official_checked_at"
  | "invalid_last_official_checked_at"
  | "future_last_official_checked_at"
  | "stale_official_check"
  | "low_source_confidence"
  | "missing_official_source_title"
  | "missing_target_people"
  | "missing_application_or_contact"
  | "missing_category"
  | "missing_life_event"
  | "unpublished_needs_review";

export type QualitySeverity = "blocker" | "warning" | "info";
export type ReviewPriority = "high" | "normal" | "low";

export interface QualityIssue {
  code: QualityIssueCode;
  label: string;
  severity: QualitySeverity;
  priority: ReviewPriority;
  blocksPublish: boolean;
  shouldQueue: boolean;
  dueOn?: string;
  details?: Record<string, unknown>;
}

export interface QualitySubject {
  slug: string;
  title?: string;
  status?: PublishStatus | string;
  officialUrl?: string | null;
  officialSourceTitle?: string | null;
  lastOfficialCheckedAt?: string | null;
  sourceConfidence?: SourceConfidence | string | null;
  targetPeople?: string | null;
  applicationMethodText?: string | null;
  contactName?: string | null;
  contactUrl?: string | null;
  categorySlugs?: string[] | null;
  lifeEventSlugs?: string[] | null;
}

export interface QualityOptions {
  todayIso?: string;
  staleDays?: number;
  includeMaintenance?: boolean;
  includeUnpublishedReview?: boolean;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return getTodayIso();
}

function isBlank(v: string | null | undefined): boolean {
  return !v || v.trim().length === 0;
}

export function getSourceHost(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

export function isOfficialishSourceHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    EXTRA_ALLOWED_HOSTS.has(h) ||
    h.endsWith(".lg.jp") ||
    h.endsWith(".go.jp") ||
    h.endsWith(".tokyo.jp") ||
    h.includes("shakyo") ||
    h.includes("syakyo") ||
    h.includes("cosw") ||
    h.startsWith("city.") ||
    h.includes(".city.")
  );
}

export function isOfficialishSourceUrl(url: string): boolean {
  const host = getSourceHost(url);
  return host ? isOfficialishSourceHost(host) : false;
}

export function daysSince(dateIso: string, baseIso: string): number | null {
  const base = Date.parse(`${baseIso}T00:00:00.000Z`);
  const checked = Date.parse(`${dateIso}T00:00:00.000Z`);
  if (Number.isNaN(base) || Number.isNaN(checked)) return null;
  return Math.floor((base - checked) / 86_400_000);
}

export function sourceFreshness(
  lastOfficialCheckedAt: string | null | undefined,
  baseIso = todayIso(),
): "fresh" | "watch" | "stale" | "future" | "unknown" {
  if (isBlank(lastOfficialCheckedAt)) return "unknown";
  const days = daysSince(lastOfficialCheckedAt!, baseIso);
  if (days == null) return "unknown";
  if (days < 0) return "future";
  if (days > SOURCE_REVIEW_STALE_DAYS) return "stale";
  if (days > SOURCE_REVIEW_WATCH_DAYS) return "watch";
  return "fresh";
}

function issue(issue: QualityIssue): QualityIssue {
  return issue;
}

export function evaluateProgramQuality(
  program: QualitySubject,
  options: QualityOptions = {},
): QualityIssue[] {
  const includeMaintenance = options.includeMaintenance ?? true;
  const includeUnpublishedReview = options.includeUnpublishedReview ?? true;
  const baseIso = options.todayIso ?? todayIso();
  const staleDays = options.staleDays ?? SOURCE_REVIEW_STALE_DAYS;
  const issues: QualityIssue[] = [];

  const officialUrl = program.officialUrl?.trim() ?? "";
  if (!officialUrl) {
    issues.push(
      issue({
        code: "missing_official_url",
        label: "公式URLがない",
        severity: "blocker",
        priority: "high",
        blocksPublish: true,
        shouldQueue: true,
      }),
    );
  } else {
    const host = getSourceHost(officialUrl);
    if (!host) {
      issues.push(
        issue({
          code: "invalid_official_url",
          label: "公式URLの形式が不正",
          severity: "blocker",
          priority: "high",
          blocksPublish: true,
          shouldQueue: true,
          details: { officialUrl },
        }),
      );
    } else {
      if (!officialUrl.startsWith("https://")) {
        issues.push(
          issue({
            code: "non_https_official_url",
            label: "公式URLがHTTPSではない",
            severity: "blocker",
            priority: "high",
            blocksPublish: true,
            shouldQueue: true,
            details: { host },
          }),
        );
      }
      if (!isOfficialishSourceHost(host)) {
        issues.push(
          issue({
            code: "unofficial_source_host",
            label: "公式・公的ソースと確認できないホスト",
            severity: "blocker",
            priority: "high",
            blocksPublish: true,
            shouldQueue: true,
            details: { host },
          }),
        );
      }
    }
  }

  if (isBlank(program.lastOfficialCheckedAt)) {
    issues.push(
      issue({
        code: "missing_last_official_checked_at",
        label: "最終確認日がない",
        severity: "blocker",
        priority: "high",
        blocksPublish: true,
        shouldQueue: true,
      }),
    );
  } else {
    const days = daysSince(program.lastOfficialCheckedAt!, baseIso);
    if (days == null) {
      issues.push(
        issue({
          code: "invalid_last_official_checked_at",
          label: "最終確認日の形式が不正",
          severity: "blocker",
          priority: "high",
          blocksPublish: true,
          shouldQueue: true,
          details: { lastOfficialCheckedAt: program.lastOfficialCheckedAt },
        }),
      );
    } else if (days < 0) {
      issues.push(
        issue({
          code: "future_last_official_checked_at",
          label: "最終確認日が未来日",
          severity: "blocker",
          priority: "high",
          blocksPublish: true,
          shouldQueue: true,
          details: { lastOfficialCheckedAt: program.lastOfficialCheckedAt },
        }),
      );
    } else if (includeMaintenance && days > staleDays) {
      issues.push(
        issue({
          code: "stale_official_check",
          label: `最終確認から${staleDays + 1}日以上経過`,
          severity: "warning",
          priority: "normal",
          blocksPublish: false,
          shouldQueue: true,
          dueOn: addDays(baseIso, 14),
          details: { daysSinceLastCheck: days },
        }),
      );
    }
  }

  if (isBlank(program.targetPeople)) {
    issues.push(
      issue({
        code: "missing_target_people",
        label: "対象者の説明がない",
        severity: "blocker",
        priority: "high",
        blocksPublish: true,
        shouldQueue: true,
      }),
    );
  }

  if (
    isBlank(program.applicationMethodText) &&
    isBlank(program.contactName) &&
    isBlank(program.contactUrl)
  ) {
    issues.push(
      issue({
        code: "missing_application_or_contact",
        label: "申請方法・問い合わせ先がない",
        severity: "blocker",
        priority: "high",
        blocksPublish: true,
        shouldQueue: true,
      }),
    );
  }

  if ((program.categorySlugs ?? []).length === 0) {
    issues.push(
      issue({
        code: "missing_category",
        label: "カテゴリ未設定",
        severity: "blocker",
        priority: "high",
        blocksPublish: true,
        shouldQueue: true,
      }),
    );
  }

  if ((program.lifeEventSlugs ?? []).length === 0) {
    issues.push(
      issue({
        code: "missing_life_event",
        label: "生活イベント未設定",
        severity: "blocker",
        priority: "high",
        blocksPublish: true,
        shouldQueue: true,
      }),
    );
  }

  if (includeMaintenance && program.sourceConfidence === "low") {
    issues.push(
      issue({
        code: "low_source_confidence",
        label: "出典信頼度が低い",
        severity: "warning",
        priority: "normal",
        blocksPublish: true,
        shouldQueue: true,
      }),
    );
  }

  if (includeMaintenance && isBlank(program.officialSourceTitle)) {
    issues.push(
      issue({
        code: "missing_official_source_title",
        label: "出典ページタイトルがない",
        severity: "info",
        priority: "low",
        blocksPublish: false,
        shouldQueue: true,
      }),
    );
  }

  if (
    includeUnpublishedReview &&
    program.status &&
    ["draft", "review"].includes(program.status)
  ) {
    issues.push(
      issue({
        code: "unpublished_needs_review",
        label:
          program.status === "draft"
            ? "下書きのため公開前レビューが必要"
            : "レビュー中",
        severity: "info",
        priority: "low",
        blocksPublish: false,
        shouldQueue: true,
      }),
    );
  }

  return issues;
}

export function getPublishBlockingIssues(
  program: QualitySubject,
  options: QualityOptions = {},
): QualityIssue[] {
  return evaluateProgramQuality(program, options).filter((i) => i.blocksPublish);
}

export function qualityIssueLabels(issues: QualityIssue[]): string[] {
  return issues.map((i) => i.label);
}

export function toQualitySubject(program: SupportProgram): QualitySubject {
  return program;
}
