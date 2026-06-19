/**
 * 管理画面のデータアクセス（ブラウザ Supabase クライアント + 管理者RLS）。
 *
 * 公開側のデータ層（app/lib/data）とは別物。ここはログイン済み管理者が
 * 全ステータスの制度を read/write するためのクライアント専用ユーティリティ。
 * 認可は DB の RLS（private.is_admin）が最終境界。UI のガードは体験のためのもの。
 *
 * ※ サーバー専用コード（react cache / supabase-server）に依存しないこと（client バンドル安全）。
 */
import { getSupabase } from "@/app/lib/supabase";
import type {
  BenefitType,
  PublishStatus,
  SourceConfidence,
} from "@/app/lib/data/types";

export interface AdminProgram {
  id: string;
  slug: string;
  prefectureSlug: string;
  prefectureName: string;
  municipalitySlug: string;
  municipalityName: string;
  title: string;
  summary: string;
  plainLanguageSummary?: string;
  categorySlugs: string[];
  lifeEventSlugs: string[];
  benefitType: BenefitType;
  targetPeople: string;
  benefitAmountText?: string;
  applicationDeadlineText?: string;
  applicationMethodText: string;
  requiredDocumentsText?: string;
  onlineApplicationAvailable?: boolean | null;
  contactName?: string;
  contactPhone?: string;
  contactUrl?: string;
  officialUrl: string;
  officialSourceTitle?: string;
  lastOfficialCheckedAt: string;
  sourceConfidence: SourceConfidence;
  uncertainFields: string[];
  disclaimerNote?: string;
  status: PublishStatus;
  publishedAt?: string | null;
  updatedAt?: string | null;
}

const SELECT = `
  id, slug, title, summary, plain_language_summary, benefit_type, target_people,
  benefit_amount_text, application_deadline_text, application_method_text,
  required_documents_text, online_application_available, contact_name, contact_phone,
  contact_url, official_url, official_source_title, last_official_checked_at,
  source_confidence, uncertain_fields, disclaimer_note, status, published_at, updated_at,
  municipality:municipalities!inner ( slug, name, prefecture:prefectures!inner ( slug, name ) ),
  categories:support_program_categories ( category:categories ( slug ) ),
  life_events:support_program_life_events ( life_event:life_events ( slug ) )
`;

type Row = Record<string, unknown> & {
  municipality?: {
    slug: string;
    name: string;
    prefecture?: { slug: string; name: string } | null;
  } | null;
  categories?: { category?: { slug: string } | null }[] | null;
  life_events?: { life_event?: { slug: string } | null }[] | null;
};

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function mapRow(r: Row): AdminProgram | null {
  const muni = r.municipality;
  const pref = muni?.prefecture;
  if (!muni?.slug || !pref?.slug) return null;
  return {
    id: String(r.id),
    slug: String(r.slug),
    prefectureSlug: pref.slug,
    prefectureName: pref.name,
    municipalitySlug: muni.slug,
    municipalityName: muni.name,
    title: String(r.title),
    summary: String(r.summary),
    plainLanguageSummary: str(r.plain_language_summary),
    categorySlugs: (r.categories ?? [])
      .map((c) => c.category?.slug)
      .filter((s): s is string => Boolean(s)),
    lifeEventSlugs: (r.life_events ?? [])
      .map((e) => e.life_event?.slug)
      .filter((s): s is string => Boolean(s)),
    benefitType: (r.benefit_type as BenefitType) ?? "other",
    targetPeople: String(r.target_people ?? ""),
    benefitAmountText: str(r.benefit_amount_text),
    applicationDeadlineText: str(r.application_deadline_text),
    applicationMethodText: String(r.application_method_text ?? ""),
    requiredDocumentsText: str(r.required_documents_text),
    onlineApplicationAvailable:
      (r.online_application_available as boolean | null) ?? null,
    contactName: str(r.contact_name),
    contactPhone: str(r.contact_phone),
    contactUrl: str(r.contact_url),
    officialUrl: String(r.official_url ?? ""),
    officialSourceTitle: str(r.official_source_title),
    lastOfficialCheckedAt: String(r.last_official_checked_at ?? ""),
    sourceConfidence: (r.source_confidence as SourceConfidence) ?? "medium",
    uncertainFields: (r.uncertain_fields as string[] | null) ?? [],
    disclaimerNote: str(r.disclaimer_note),
    status: (r.status as PublishStatus) ?? "draft",
    publishedAt: (r.published_at as string | null) ?? null,
    updatedAt: (r.updated_at as string | null) ?? null,
  };
}

// ---- 品質ゲート（公開可能か）---------------------------------------------
/** index/公開の最低品質を満たさない理由（空配列なら公開可能）。 */
export function qualityIssues(p: AdminProgram): string[] {
  const issues: string[] = [];
  if (!p.officialUrl) issues.push("公式URLがない");
  if (!p.lastOfficialCheckedAt) issues.push("最終確認日がない");
  if (!p.targetPeople) issues.push("対象者の説明がない");
  if (!p.applicationMethodText && !p.contactName && !p.contactUrl)
    issues.push("申請方法・問い合わせ先がない");
  if (p.categorySlugs.length === 0) issues.push("カテゴリ未設定");
  if (p.lifeEventSlugs.length === 0) issues.push("生活イベント未設定");
  return issues;
}

/** 最終確認日からの鮮度。 */
export function freshness(
  p: AdminProgram,
  todayIso: string,
): "fresh" | "watch" | "stale" | "unknown" {
  if (!p.lastOfficialCheckedAt) return "unknown";
  const days =
    (Date.parse(todayIso) - Date.parse(p.lastOfficialCheckedAt)) / 86_400_000;
  if (Number.isNaN(days)) return "unknown";
  if (days <= 30) return "fresh";
  if (days <= 90) return "watch";
  return "stale";
}

// ---- クエリ ----------------------------------------------------------------
function client() {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase 未設定（管理画面はログインが必要です）");
  return sb;
}

/** ログイン済みユーザーが管理者か（app_roles を本人の行だけ read）。 */
export async function checkIsAdmin(): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return false;
  const { data, error } = await sb
    .from("app_roles")
    .select("role")
    .eq("user_id", auth.user.id)
    .eq("role", "admin")
    .maybeSingle();
  return !error && Boolean(data);
}

export interface SupportFilter {
  status?: PublishStatus | "all";
  q?: string;
}

/** 一覧の取得上限（超えたら UI が「上限まで表示」と明示する）。 */
export const SUPPORTS_LIST_LIMIT = 1000;

export async function fetchSupports(
  f: SupportFilter = {},
): Promise<AdminProgram[]> {
  let query = client()
    .from("support_programs")
    .select(SELECT)
    .order("updated_at", { ascending: false })
    .limit(SUPPORTS_LIST_LIMIT);
  if (f.status && f.status !== "all") query = query.eq("status", f.status);
  if (f.q && f.q.trim()) query = query.ilike("title", `%${f.q.trim()}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as unknown as Row[]).map(mapRow).filter(Boolean) as AdminProgram[];
}

export async function fetchSupport(id: string): Promise<AdminProgram | null> {
  const { data, error } = await client()
    .from("support_programs")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data as unknown as Row) : null;
}

/** 編集可能な列（snake_case）を部分更新。revision は DB トリガが自動記録。 */
export type SupportPatch = Partial<{
  title: string;
  summary: string;
  plain_language_summary: string | null;
  benefit_type: BenefitType;
  target_people: string;
  benefit_amount_text: string | null;
  application_deadline_text: string | null;
  application_method_text: string;
  required_documents_text: string | null;
  online_application_available: boolean | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_url: string | null;
  official_url: string;
  official_source_title: string | null;
  last_official_checked_at: string;
  source_confidence: SourceConfidence;
  disclaimer_note: string | null;
}>;

/** 空文字を null にすべき nullable 列（フォームの空欄を NULL として保存する）。 */
const NULLABLE_PATCH_FIELDS: (keyof SupportPatch)[] = [
  "plain_language_summary",
  "benefit_amount_text",
  "application_deadline_text",
  "required_documents_text",
  "contact_name",
  "contact_phone",
  "contact_url",
  "official_source_title",
  "disclaimer_note",
];

export async function updateSupport(
  id: string,
  patch: SupportPatch,
): Promise<void> {
  // フォームの空欄（""）は、nullable 列では NULL として保存する（NULL↔"" の取り違えを防ぐ）。
  const normalized: Record<string, unknown> = { ...patch };
  for (const k of NULLABLE_PATCH_FIELDS) {
    if (normalized[k] === "") normalized[k] = null;
  }
  const { error } = await client()
    .from("support_programs")
    .update(normalized)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** ステータス変更。published にするときは品質ゲートを満たす場合のみ許可。
 *  多層防御: ①ここ（クライアントUX）②DBトリガ enforce_publish_quality（最終強制）
 *  ③公開側 isPublishable 再フィルタ。①を devtools で迂回しても②③で守られる。 */
export async function setStatus(
  program: AdminProgram,
  status: PublishStatus,
): Promise<void> {
  if (status === "published" && qualityIssues(program).length > 0) {
    throw new Error(
      "公開品質ゲートを満たしていません: " +
        qualityIssues(program).join(" / "),
    );
  }
  const patch: Record<string, unknown> = { status };
  if (status === "published") patch.published_at = new Date().toISOString();
  const { error } = await client()
    .from("support_programs")
    .update(patch)
    .eq("id", program.id);
  if (error) throw new Error(error.message);
}

// ---- 統計（ダッシュボード）------------------------------------------------
export interface AdminStats {
  byStatus: Record<PublishStatus, number>;
  total: number;
  reviewQueueOpen: number;
}

export async function fetchStats(): Promise<AdminStats> {
  const sb = client();
  const statuses: PublishStatus[] = ["draft", "review", "published", "archived"];
  const byStatus = {} as Record<PublishStatus, number>;
  for (const s of statuses) {
    const { count } = await sb
      .from("support_programs")
      .select("*", { count: "exact", head: true })
      .eq("status", s);
    byStatus[s] = count ?? 0;
  }
  const { count: total } = await sb
    .from("support_programs")
    .select("*", { count: "exact", head: true });
  const { count: rq } = await sb
    .from("review_queue_items")
    .select("*", { count: "exact", head: true })
    .eq("status", "open");
  return {
    byStatus,
    total: total ?? 0,
    reviewQueueOpen: rq ?? 0,
  };
}

// ---- レビューキュー --------------------------------------------------------
export interface ReviewItem {
  id: string;
  reason: string;
  priority: string;
  status: string;
  dueOn: string | null;
  createdAt: string;
  programSlug: string | null;
  programTitle: string | null;
}

export async function fetchReviewQueue(): Promise<ReviewItem[]> {
  const { data, error } = await client()
    .from("review_queue_items")
    .select(
      "id, reason, priority, status, due_on, created_at, support_programs ( slug, title )",
    )
    .eq("status", "open")
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);
  type RQ = {
    id: string;
    reason: string;
    priority: string;
    status: string;
    due_on: string | null;
    created_at: string;
    support_programs?: { slug: string; title: string } | null;
  };
  return (data as unknown as RQ[]).map((r) => ({
    id: r.id,
    reason: r.reason,
    priority: r.priority,
    status: r.status,
    dueOn: r.due_on,
    createdAt: r.created_at,
    programSlug: r.support_programs?.slug ?? null,
    programTitle: r.support_programs?.title ?? null,
  }));
}

export async function resolveReviewItem(id: string): Promise<void> {
  const { error } = await client()
    .from("review_queue_items")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
