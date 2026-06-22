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
import { escapeLike } from "@/app/lib/sanitize";
import {
  evaluateProgramQuality,
  getPublishBlockingIssues,
  qualityIssueLabels,
  sourceFreshness,
} from "@/app/lib/data/quality";
import type { ImportRow } from "./csv";

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
  return qualityIssueLabels(evaluateProgramQuality(p));
}

/** published へ進める前に必ず解消する問題。 */
export function publishBlockingIssues(p: AdminProgram): string[] {
  return qualityIssueLabels(getPublishBlockingIssues(p));
}

/** 最終確認日からの鮮度。 */
export function freshness(
  p: AdminProgram,
  todayIso: string,
): "fresh" | "watch" | "stale" | "future" | "unknown" {
  return sourceFreshness(p.lastOfficialCheckedAt, todayIso);
}

// ---- クエリ ----------------------------------------------------------------
function client() {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase 未設定（管理画面はログインが必要です）");
  return sb;
}

/** ログイン済みユーザーが管理者か（app_roles を本人の行だけ read）。 */
export async function checkIsAdmin(): Promise<boolean> {
  return (await fetchAdminPrincipal()).isAdmin;
}

export interface AdminPrincipal {
  userId: string | null;
  email: string | null;
  isAdmin: boolean;
  adminSince: string | null;
}

/** ログイン中の本人と admin ロール付与状態。app_roles は本人行のみ RLS で読める。 */
export async function fetchAdminPrincipal(): Promise<AdminPrincipal> {
  const sb = getSupabase();
  if (!sb) {
    return { userId: null, email: null, isAdmin: false, adminSince: null };
  }
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) {
    return { userId: null, email: null, isAdmin: false, adminSince: null };
  }
  const { data, error } = await sb
    .from("app_roles")
    .select("role, created_at")
    .eq("user_id", auth.user.id)
    .eq("role", "admin")
    .maybeSingle();
  return {
    userId: auth.user.id,
    email: auth.user.email ?? null,
    isAdmin: !error && Boolean(data),
    adminSince:
      !error && data && typeof data.created_at === "string"
        ? data.created_at
        : null,
  };
}

export interface SupportFilter {
  status?: PublishStatus | "all";
  q?: string;
}

/** 一覧の取得上限（超えたら UI が「上限まで表示」と明示する）。 */
export const SUPPORTS_LIST_LIMIT = 2500;

export async function fetchSupports(
  f: SupportFilter = {},
): Promise<AdminProgram[]> {
  let query = client()
    .from("support_programs")
    .select(SELECT)
    .order("updated_at", { ascending: false })
    .limit(SUPPORTS_LIST_LIMIT);
  if (f.status && f.status !== "all") query = query.eq("status", f.status);
  if (f.q && f.q.trim()) query = query.ilike("title", `%${escapeLike(f.q.trim())}%`);
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
  const blocking = publishBlockingIssues(program);
  if (status === "published" && blocking.length > 0) {
    throw new Error(
      "公開品質ゲートを満たしていません: " +
        blocking.join(" / "),
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

// ---- マスタ（タグ・自治体の選択肢）---------------------------------------
export interface MasterOption {
  id: string;
  slug: string;
  name: string;
}
export interface MunicipalityOption extends MasterOption {
  prefectureName: string;
  prefectureSlug: string;
}

export async function fetchCategoryOptions(): Promise<MasterOption[]> {
  const { data, error } = await client()
    .from("categories")
    .select("id, slug, name")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as MasterOption[];
}

export async function fetchLifeEventOptions(): Promise<MasterOption[]> {
  const { data, error } = await client()
    .from("life_events")
    .select("id, slug, name")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as MasterOption[];
}

export async function fetchMunicipalityOptions(): Promise<MunicipalityOption[]> {
  const { data, error } = await client()
    .from("municipalities")
    .select("id, slug, name, prefecture:prefectures!inner ( slug, name )")
    .order("name");
  if (error) throw new Error(error.message);
  type Row = {
    id: string;
    slug: string;
    name: string;
    prefecture: { slug: string; name: string } | null;
  };
  return (data as unknown as Row[])
    .filter((r) => r.prefecture)
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      prefectureSlug: r.prefecture!.slug,
      prefectureName: r.prefecture!.name,
    }));
}

// ---- 公開ページの即時再生成（ISR on-demand revalidate） -------------------
/** ある制度の編集が影響する公開ページのパス一覧。 */
export function affectedPaths(p: {
  prefectureSlug: string;
  municipalitySlug: string;
  slug: string;
  categorySlugs: string[];
  lifeEventSlugs: string[];
}): string[] {
  const paths = new Set<string>();
  paths.add("/");
  paths.add(`/supports/${p.slug}`);
  paths.add(`/${p.prefectureSlug}`);
  paths.add(`/${p.prefectureSlug}/${p.municipalitySlug}`);
  for (const le of p.lifeEventSlugs)
    paths.add(`/${p.prefectureSlug}/${p.municipalitySlug}/${le}`);
  for (const c of p.categorySlugs) paths.add(`/compare/${c}`);
  return [...paths];
}

/** 管理者セッションのトークンで /api/admin/revalidate を叩き、公開ページを即時再生成。
 *  失敗しても保存自体は成功扱いにする（反映は ISR の時間経過でも追従するため）。 */
export async function revalidatePublic(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const sb = getSupabase();
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return;
  try {
    await fetch("/api/admin/revalidate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ paths }),
    });
  } catch {
    // 反映は ISR(revalidate=86400) でも追従するため、ここでは握りつぶす。
  }
}

/** 既存制度の slug→status（CSV 取込で「新規/更新/公開中の上書き」を判定するため）。 */
export async function fetchSlugStatusMap(): Promise<Map<string, PublishStatus>> {
  const { data, error } = await client()
    .from("support_programs")
    .select("slug, status")
    .limit(20000);
  if (error) throw new Error(error.message);
  const map = new Map<string, PublishStatus>();
  for (const r of (data ?? []) as { slug: string; status: PublishStatus }[]) {
    map.set(r.slug, r.status);
  }
  return map;
}

// ---- タグ（カテゴリ / 生活イベント）の差し替え ----------------------------
/** 制度のカテゴリ/生活イベントを、指定 slug 集合へ置き換える（join 行を delete→insert）。 */
export async function setProgramTags(
  programId: string,
  categorySlugs: string[],
  lifeEventSlugs: string[],
): Promise<void> {
  const sb = client();
  const [cats, events] = await Promise.all([
    fetchCategoryOptions(),
    fetchLifeEventOptions(),
  ]);
  const catIds = categorySlugs
    .map((s) => cats.find((c) => c.slug === s)?.id)
    .filter((x): x is string => Boolean(x));
  const eventIds = lifeEventSlugs
    .map((s) => events.find((e) => e.slug === s)?.id)
    .filter((x): x is string => Boolean(x));

  const delCat = await sb
    .from("support_program_categories")
    .delete()
    .eq("support_program_id", programId);
  if (delCat.error) throw new Error(delCat.error.message);
  if (catIds.length) {
    const ins = await sb
      .from("support_program_categories")
      .insert(catIds.map((category_id) => ({ support_program_id: programId, category_id })));
    if (ins.error) throw new Error(ins.error.message);
  }

  const delEvent = await sb
    .from("support_program_life_events")
    .delete()
    .eq("support_program_id", programId);
  if (delEvent.error) throw new Error(delEvent.error.message);
  if (eventIds.length) {
    const ins = await sb
      .from("support_program_life_events")
      .insert(
        eventIds.map((life_event_id) => ({ support_program_id: programId, life_event_id })),
      );
    if (ins.error) throw new Error(ins.error.message);
  }
}

// ---- 新規制度の作成 -------------------------------------------------------
export interface CreateSupportInput {
  municipalityId: string;
  slug: string;
  title: string;
  summary: string;
  targetPeople: string;
  applicationMethodText: string;
  officialUrl: string;
  lastOfficialCheckedAt: string;
  benefitType: BenefitType;
  sourceConfidence: SourceConfidence;
  categorySlugs: string[];
  lifeEventSlugs: string[];
}

/** 新規制度を draft で作成し、タグを設定して、作成された id を返す。 */
export async function createSupport(input: CreateSupportInput): Promise<string> {
  const { data, error } = await client()
    .from("support_programs")
    .insert({
      municipality_id: input.municipalityId,
      slug: input.slug.trim(),
      title: input.title,
      summary: input.summary,
      target_people: input.targetPeople,
      application_method_text: input.applicationMethodText,
      official_url: input.officialUrl,
      last_official_checked_at: input.lastOfficialCheckedAt,
      benefit_type: input.benefitType,
      source_confidence: input.sourceConfidence,
      status: "draft",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const id = (data as { id: string }).id;
  await setProgramTags(id, input.categorySlugs, input.lifeEventSlugs);
  return id;
}

// ---- CSV 取込（検証済み行を upsert） --------------------------------------
export interface ImportResult {
  ok: number;
  /** 公開中だったため CSV の status を無視し published を維持した行数。 */
  statusPreserved: number;
  failed: { slug: string; error: string }[];
}

/** 検証済みの ImportRow[] を upsert（slug 衝突は更新）し、タグを設定する。
 *  安全策: 既存で公開中（published）の制度は CSV で status を変更しない
 *  （誤った非公開化・破壊を防ぐ。ステータス変更は管理画面の操作で行う）。 */
export async function importPrograms(rows: ImportRow[]): Promise<ImportResult> {
  const sb = client();
  const [munis, slugStatus] = await Promise.all([
    fetchMunicipalityOptions(),
    fetchSlugStatusMap(),
  ]);
  const muniMap = new Map(
    munis.map((m) => [`${m.prefectureSlug}/${m.slug}`, m.id]),
  );
  const result: ImportResult = { ok: 0, statusPreserved: 0, failed: [] };
  for (const row of rows) {
    const muniId = muniMap.get(`${row.prefectureSlug}/${row.municipalitySlug}`);
    if (!muniId) {
      result.failed.push({ slug: row.slug, error: "自治体を解決できません" });
      continue;
    }
    const existing = slugStatus.get(row.slug);
    // 公開中の制度は status を維持（CSV による降格・非公開化を拒否）。
    let effectiveStatus = row.status;
    if (existing === "published" && row.status !== "published") {
      effectiveStatus = "published";
      result.statusPreserved++;
    }
    const payload: Record<string, unknown> = {
      municipality_id: muniId,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      target_people: row.targetPeople,
      application_method_text: row.applicationMethodText,
      official_url: row.officialUrl,
      last_official_checked_at: row.lastOfficialCheckedAt,
      benefit_type: row.benefitType,
      source_confidence: row.sourceConfidence,
      status: effectiveStatus,
    };
    // 新たに published へ昇格する場合は published_at を設定（setStatus と整合）。
    if (effectiveStatus === "published" && existing !== "published") {
      payload.published_at = new Date().toISOString();
    }
    const { data, error } = await sb
      .from("support_programs")
      .upsert(payload, { onConflict: "slug" })
      .select("id")
      .single();
    if (error || !data) {
      result.failed.push({
        slug: row.slug,
        error: error?.message ?? "upsert に失敗",
      });
      continue;
    }
    try {
      await setProgramTags(
        (data as { id: string }).id,
        row.categorySlugs,
        row.lifeEventSlugs,
      );
    } catch (e) {
      result.failed.push({
        slug: row.slug,
        error: "タグ設定に失敗: " + (e as Error).message,
      });
      continue;
    }
    result.ok++;
  }
  return result;
}

// ---- 統計（ダッシュボード）------------------------------------------------
export interface AdminStats {
  byStatus: Record<PublishStatus, number>;
  total: number;
  reviewQueueOpen: number;
  sourcesNeedReview: number;
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
  const { count: sourcesNeedReview } = await sb
    .from("support_sources")
    .select("*", { count: "exact", head: true })
    .eq("quality_state", "needs_review");
  return {
    byStatus,
    total: total ?? 0,
    reviewQueueOpen: rq ?? 0,
    sourcesNeedReview: sourcesNeedReview ?? 0,
  };
}

// ---- 出典・改訂履歴 --------------------------------------------------------
export type SourceKind = "official" | "related" | "archive" | "manual";
export type SourceQualityState =
  | "ok"
  | "unchecked"
  | "needs_review"
  | "broken"
  | "low_confidence";

export interface SupportSource {
  id: string;
  supportProgramId: string;
  url: string;
  title: string | null;
  publisher: string | null;
  retrievedAt: string | null;
  officialCheckedAt: string | null;
  contentHash: string | null;
  lastChangedAt: string | null;
  fetchedContentHash: string | null;
  fetchedContentType: string | null;
  lastFetchedAt: string | null;
  lastFetchStatus: number | null;
  lastFetchError: string | null;
  lastFetchChangedAt: string | null;
  notes: string | null;
  createdAt: string;
  sourceKind: SourceKind | string;
  qualityState: SourceQualityState | string;
  detectedIssueCodes: string[];
  reviewIntervalDays: number;
}

export interface SupportSourceInput {
  id?: string;
  supportProgramId: string;
  url: string;
  title?: string | null;
  publisher?: string | null;
  officialCheckedAt?: string | null;
  notes?: string | null;
  sourceKind?: SourceKind | string;
  qualityState?: SourceQualityState | string;
  detectedIssueCodes?: string[];
  reviewIntervalDays?: number | null;
}

export interface SupportRevision {
  id: string;
  supportProgramId: string;
  programSlug: string | null;
  programTitle: string | null;
  changedBy: string | null;
  changeType: string;
  changeSummary: string | null;
  externalKey: string | null;
  beforeJson: unknown;
  afterJson: unknown;
  createdAt: string;
}

const SOURCE_SELECT = `
  id, support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, last_changed_at, fetched_content_hash, fetched_content_type,
  last_fetched_at, last_fetch_status, last_fetch_error, last_fetch_changed_at,
  notes, created_at, source_kind, quality_state,
  detected_issue_codes, review_interval_days
`;

function nullableTrim(v: string | null | undefined): string | null {
  const trimmed = typeof v === "string" ? v.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

function mapSource(r: Record<string, unknown>): SupportSource {
  return {
    id: String(r.id),
    supportProgramId: String(r.support_program_id),
    url: String(r.url ?? ""),
    title: nullableTrim(r.title as string | null | undefined),
    publisher: nullableTrim(r.publisher as string | null | undefined),
    retrievedAt: (r.retrieved_at as string | null) ?? null,
    officialCheckedAt: (r.official_checked_at as string | null) ?? null,
    contentHash: (r.content_hash as string | null) ?? null,
    lastChangedAt: (r.last_changed_at as string | null) ?? null,
    fetchedContentHash: (r.fetched_content_hash as string | null) ?? null,
    fetchedContentType: (r.fetched_content_type as string | null) ?? null,
    lastFetchedAt: (r.last_fetched_at as string | null) ?? null,
    lastFetchStatus:
      typeof r.last_fetch_status === "number" ? r.last_fetch_status : null,
    lastFetchError: (r.last_fetch_error as string | null) ?? null,
    lastFetchChangedAt: (r.last_fetch_changed_at as string | null) ?? null,
    notes: nullableTrim(r.notes as string | null | undefined),
    createdAt: String(r.created_at),
    sourceKind: String(r.source_kind ?? "official"),
    qualityState: String(r.quality_state ?? "unchecked"),
    detectedIssueCodes: (r.detected_issue_codes as string[] | null) ?? [],
    reviewIntervalDays: Number(r.review_interval_days ?? 90),
  };
}

export async function fetchSupportSources(
  programId: string,
): Promise<SupportSource[]> {
  const { data, error } = await client()
    .from("support_sources")
    .select(SOURCE_SELECT)
    .eq("support_program_id", programId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapSource);
}

export async function saveSupportSource(
  input: SupportSourceInput,
): Promise<string> {
  const url = input.url.trim();
  if (!url) throw new Error("出典URLは必須です");
  const rawReviewIntervalDays = Number.isFinite(input.reviewIntervalDays)
    ? input.reviewIntervalDays
    : 90;
  const reviewIntervalDays = Math.max(
    1,
    Math.floor(rawReviewIntervalDays ?? 90),
  );
  const payload = {
    support_program_id: input.supportProgramId,
    url,
    title: nullableTrim(input.title),
    publisher: nullableTrim(input.publisher),
    official_checked_at: nullableTrim(input.officialCheckedAt),
    notes: nullableTrim(input.notes),
    source_kind: input.sourceKind ?? "official",
    quality_state: input.qualityState ?? "unchecked",
    detected_issue_codes: input.detectedIssueCodes ?? [],
    review_interval_days: reviewIntervalDays,
  };
  const query = input.id
    ? client()
        .from("support_sources")
        .update(payload)
        .eq("id", input.id)
        .eq("support_program_id", input.supportProgramId)
        .select("id")
        .single()
    : client().from("support_sources").insert(payload).select("id").single();
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function fetchSupportRevisions(
  programId: string,
  limit = 20,
): Promise<SupportRevision[]> {
  const { data, error } = await client()
    .from("support_revisions")
    .select(
      "id, support_program_id, changed_by, change_type, change_summary, external_key, before_json, after_json, created_at",
    )
    .eq("support_program_id", programId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  type RevisionRow = {
    id: string;
    support_program_id: string;
    changed_by: string | null;
    change_type: string;
    change_summary: string | null;
    external_key: string | null;
    before_json: unknown;
    after_json: unknown;
    created_at: string;
  };
  return ((data ?? []) as RevisionRow[]).map((r) => ({
    id: r.id,
    supportProgramId: r.support_program_id,
    programSlug: null,
    programTitle: null,
    changedBy: r.changed_by,
    changeType: r.change_type,
    changeSummary: r.change_summary,
    externalKey: r.external_key,
    beforeJson: r.before_json,
    afterJson: r.after_json,
    createdAt: r.created_at,
  }));
}

export async function fetchRecentRevisions(limit = 80): Promise<SupportRevision[]> {
  const { data, error } = await client()
    .from("support_revisions")
    .select(
      "id, support_program_id, changed_by, change_type, change_summary, external_key, before_json, after_json, created_at, support_programs ( id, slug, title )",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  type RevisionRow = {
    id: string;
    support_program_id: string;
    changed_by: string | null;
    change_type: string;
    change_summary: string | null;
    external_key: string | null;
    before_json: unknown;
    after_json: unknown;
    created_at: string;
    support_programs?: { id: string; slug: string; title: string } | null;
  };
  return ((data ?? []) as unknown as RevisionRow[]).map((r) => ({
    id: r.id,
    supportProgramId: r.support_program_id,
    programSlug: r.support_programs?.slug ?? null,
    programTitle: r.support_programs?.title ?? null,
    changedBy: r.changed_by,
    changeType: r.change_type,
    changeSummary: r.change_summary,
    externalKey: r.external_key,
    beforeJson: r.before_json,
    afterJson: r.after_json,
    createdAt: r.created_at,
  }));
}

// ---- レビューキュー --------------------------------------------------------
export interface ReviewItem {
  id: string;
  programId: string | null;
  sourceId: string | null;
  reason: string;
  priority: string;
  status: string;
  dueOn: string | null;
  issueCode: string | null;
  severity: string;
  detectedBy: string;
  sourceLastCheckedAt: string | null;
  diffJson: unknown;
  createdAt: string;
  programSlug: string | null;
  programTitle: string | null;
}

export interface ReviewQueueFilter {
  programId?: string;
  status?: "open" | "resolved" | "all";
  limit?: number;
}

export async function fetchReviewQueue(
  f: ReviewQueueFilter = {},
): Promise<ReviewItem[]> {
  let query = client()
    .from("review_queue_items")
    .select(
      "id, support_program_id, source_id, reason, priority, status, due_on, diff_json, created_at, issue_code, severity, detected_by, source_last_checked_at, support_programs ( id, slug, title )",
    )
    .order("created_at", { ascending: true })
    .limit(f.limit ?? 200);
  if ((f.status ?? "open") !== "all") query = query.eq("status", f.status ?? "open");
  if (f.programId) query = query.eq("support_program_id", f.programId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  type RQ = {
    id: string;
    support_program_id: string | null;
    source_id: string | null;
    reason: string;
    priority: string;
    status: string;
    due_on: string | null;
    diff_json: unknown;
    created_at: string;
    issue_code: string | null;
    severity: string;
    detected_by: string;
    source_last_checked_at: string | null;
    support_programs?: { id: string; slug: string; title: string } | null;
  };
  return (data as unknown as RQ[]).map((r) => ({
    id: r.id,
    programId: r.support_program_id ?? r.support_programs?.id ?? null,
    sourceId: r.source_id,
    reason: r.reason,
    priority: r.priority,
    status: r.status,
    dueOn: r.due_on,
    issueCode: r.issue_code,
    severity: r.severity,
    detectedBy: r.detected_by,
    sourceLastCheckedAt: r.source_last_checked_at,
    diffJson: r.diff_json,
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
