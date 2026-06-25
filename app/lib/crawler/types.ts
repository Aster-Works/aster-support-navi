/**
 * 発見クローラの共有型と zod スキーマ（依存は zod のみ・クライアント安全）。
 *
 * ここには cheerio / @anthropic-ai/sdk / node 専用 API を import しない。
 * 管理画面（ブラウザ）と cron（Node）の両方から型として読めるようにするため。
 */
import { z } from "zod";

// ---- 列挙 ------------------------------------------------------------------
export const CANDIDATE_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "needs_more_info",
] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const CHANGE_TYPES = [
  "new",
  "updated",
  "unchanged",
  "possibly_removed",
] as const;
export type ChangeType = (typeof CHANGE_TYPES)[number];

export const CRAWL_STATUSES = [
  "pending",
  "fetched",
  "unchanged",
  "changed",
  "error",
  "skipped",
  "blocked",
  "not_found",
] as const;
export type CrawlStatus = (typeof CRAWL_STATUSES)[number];

export const SOURCE_TYPES = [
  "html",
  "sitemap",
  "pdf",
  "csv",
  "excel",
  "manual",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

// ---- AI 抽出スキーマ -------------------------------------------------------
/** 本文に書かれていない項目は null。これは zod の検証スキーマ。 */
const nullableStr = z.string().nullable();

export const ExtractedProgramSchema = z.object({
  title: z.string().min(1),
  category: nullableStr,
  summary: nullableStr,
  target_people: nullableStr,
  eligibility_conditions: nullableStr,
  benefit_detail: nullableStr,
  amount: nullableStr,
  application_method: nullableStr,
  required_documents: nullableStr,
  deadline: nullableStr,
  contact_department: nullableStr,
  contact_phone: nullableStr,
  contact_url: nullableStr,
  official_url: z.string(),
  source_quote: z.string(),
  confidence: z.number(),
  risk_flags: z.array(z.string()),
});
export type ExtractedProgram = z.infer<typeof ExtractedProgramSchema>;

export const ExtractionResultSchema = z.object({
  programs: z.array(ExtractedProgramSchema),
});
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

/**
 * Anthropic の forced tool（structured output）用 JSON Schema。
 * strict 互換のため、すべて required、nullable は ["string","null"] で表す。
 */
export const EXTRACTION_TOOL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    programs: {
      type: "array",
      description:
        "本文から確実に読み取れる支援制度のみ。支援制度ページでなければ空配列。",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", description: "実在の制度名" },
          category: {
            type: ["string", "null"],
            description:
              "childcare / elderly / welfare / livelihood / disability / medical などの大分類ヒント",
          },
          summary: { type: ["string", "null"] },
          target_people: { type: ["string", "null"] },
          eligibility_conditions: { type: ["string", "null"] },
          benefit_detail: { type: ["string", "null"] },
          amount: { type: ["string", "null"] },
          application_method: { type: ["string", "null"] },
          required_documents: { type: ["string", "null"] },
          deadline: { type: ["string", "null"] },
          contact_department: { type: ["string", "null"] },
          contact_phone: { type: ["string", "null"] },
          contact_url: { type: ["string", "null"] },
          official_url: {
            type: "string",
            description: "この制度を説明している公式ページのURL",
          },
          source_quote: {
            type: "string",
            description: "根拠となる本文の短い引用（30〜200字程度）",
          },
          confidence: {
            type: "number",
            description: "0.0〜1.0。本文から根拠が取れないほど低くする",
          },
          risk_flags: {
            type: "array",
            items: { type: "string" },
            description:
              "amount_uncertain / deadline_uncertain / eligibility_uncertain など",
          },
        },
        required: [
          "title",
          "category",
          "summary",
          "target_people",
          "eligibility_conditions",
          "benefit_detail",
          "amount",
          "application_method",
          "required_documents",
          "deadline",
          "contact_department",
          "contact_phone",
          "contact_url",
          "official_url",
          "source_quote",
          "confidence",
          "risk_flags",
        ],
      },
    },
  },
  required: ["programs"],
} as const;

// ---- DB 行（クローラコアが使う最小形） -------------------------------------
export interface CrawlerSourceRow {
  id: string;
  name: string;
  municipality_name: string | null;
  municipality_code: string | null;
  prefecture: string | null;
  municipality_id: string | null;
  source_type: SourceType;
  base_url: string;
  allowed_domains: string[];
  seed_urls: string[];
  include_patterns: string[];
  exclude_patterns: string[];
  category_hints: string[];
  is_active: boolean;
  consecutive_error_count: number;
}

export interface CrawledDocumentRow {
  id: string;
  source_id: string;
  url: string;
  title: string | null;
  content_type: string | null;
  status_code: number | null;
  etag: string | null;
  last_modified: string | null;
  content_hash: string | null;
}

/** 差分比較に使う既存公開制度の最小形。 */
export interface ExistingProgram {
  id: string;
  title: string;
  official_url: string;
  category: string | null;
  target_people: string | null;
  benefit_amount_text: string | null;
  application_deadline_text: string | null;
  application_method_text: string | null;
  required_documents_text: string | null;
  contact_phone: string | null;
}

/** 全体設定（key/value を型に展開したもの）。 */
export interface CrawlerSettings {
  crawler_enabled: boolean;
  ai_extraction_enabled: boolean;
  max_sources_per_run: number;
  max_urls_per_source: number;
  max_depth: number;
  domain_min_interval_ms: number;
  auto_pause_error_threshold: number;
}

export const DEFAULT_CRAWLER_SETTINGS: CrawlerSettings = {
  crawler_enabled: false,
  ai_extraction_enabled: true,
  max_sources_per_run: 5,
  max_urls_per_source: 40,
  max_depth: 2,
  domain_min_interval_ms: 2000,
  auto_pause_error_threshold: 3,
};
