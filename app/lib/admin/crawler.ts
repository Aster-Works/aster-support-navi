/**
 * 発見クローラの管理画面データアクセス（ブラウザ Supabase + 管理者RLS）。
 *
 * 公開側・サーバー専用コードに依存しない（client バンドル安全）。
 * service_role は使わない。最終的な認可境界は DB の RLS（private.is_admin）。
 * 手動実行だけは server route（/api/admin/crawler/run）に Bearer で委譲する。
 */
import { getSupabase } from "@/app/lib/supabase";
import { buildSupportSlug } from "@/app/lib/slug";
import { escapeLike } from "@/app/lib/sanitize";
import type {
  CandidateStatus,
  ChangeType,
  CrawlStatus,
} from "@/app/lib/crawler/types";

function client() {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase 未設定（管理画面はログインが必要です）");
  return sb;
}

function todayJst(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(
    new Date(),
  );
}

// ---- 全体設定 --------------------------------------------------------------
export type SettingKey =
  | "crawler_enabled"
  | "ai_extraction_enabled"
  | "max_sources_per_run"
  | "max_urls_per_source"
  | "max_depth"
  | "domain_min_interval_ms"
  | "auto_pause_error_threshold";

export type CrawlerSettingsMap = Record<SettingKey, unknown>;

export async function fetchCrawlerSettings(): Promise<CrawlerSettingsMap> {
  const { data, error } = await client().from("crawler_settings").select("key, value");
  if (error) throw new Error(error.message);
  const map = {} as CrawlerSettingsMap;
  for (const r of (data ?? []) as { key: SettingKey; value: unknown }[]) {
    map[r.key] = r.value;
  }
  return map;
}

export async function updateSetting(key: SettingKey, value: unknown): Promise<void> {
  const sb = client();
  const { data: auth } = await sb.auth.getUser();
  const { error } = await sb
    .from("crawler_settings")
    .update({ value, updated_by: auth.user?.id ?? null })
    .eq("key", key);
  if (error) throw new Error(error.message);
}

// ---- source（自治体クロール対象） -----------------------------------------
export interface CrawlerSourceAdmin {
  id: string;
  name: string;
  municipalityName: string | null;
  prefecture: string | null;
  municipalityId: string | null;
  baseUrl: string;
  isActive: boolean;
  pausedReason: string | null;
  pausedAt: string | null;
  consecutiveErrorCount: number;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  categoryHints: string[];
}

const SOURCE_SELECT =
  "id, name, municipality_name, prefecture, municipality_id, base_url, is_active, " +
  "paused_reason, paused_at, consecutive_error_count, last_checked_at, " +
  "last_success_at, last_error_at, last_error_message, category_hints";

function mapSource(r: Record<string, unknown>): CrawlerSourceAdmin {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    municipalityName: (r.municipality_name as string | null) ?? null,
    prefecture: (r.prefecture as string | null) ?? null,
    municipalityId: (r.municipality_id as string | null) ?? null,
    baseUrl: String(r.base_url ?? ""),
    isActive: Boolean(r.is_active),
    pausedReason: (r.paused_reason as string | null) ?? null,
    pausedAt: (r.paused_at as string | null) ?? null,
    consecutiveErrorCount: Number(r.consecutive_error_count ?? 0),
    lastCheckedAt: (r.last_checked_at as string | null) ?? null,
    lastSuccessAt: (r.last_success_at as string | null) ?? null,
    lastErrorAt: (r.last_error_at as string | null) ?? null,
    lastErrorMessage: (r.last_error_message as string | null) ?? null,
    categoryHints: (r.category_hints as string[] | null) ?? [],
  };
}

export async function fetchCrawlerSources(): Promise<CrawlerSourceAdmin[]> {
  const { data, error } = await client()
    .from("crawler_sources")
    .select(SOURCE_SELECT)
    .order("prefecture", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapSource);
}

/** source の稼働/停止。停止時は paused_reason を残し、再開時はエラー数もリセット。 */
export async function setSourceActive(id: string, active: boolean): Promise<void> {
  const sb = client();
  const { data: auth } = await sb.auth.getUser();
  const patch = active
    ? {
        is_active: true,
        paused_reason: null,
        paused_by: null,
        paused_at: null,
        consecutive_error_count: 0,
      }
    : {
        is_active: false,
        paused_reason: "manual: 管理者により停止",
        paused_by: auth.user?.id ?? null,
        paused_at: new Date().toISOString(),
      };
  const { error } = await sb.from("crawler_sources").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

// ---- 候補（レビューキュー） ------------------------------------------------
export interface CandidateAdmin {
  id: string;
  candidateStatus: CandidateStatus;
  changeType: ChangeType;
  municipalityName: string | null;
  municipalityId: string | null;
  prefecture: string | null;
  category: string | null;
  title: string;
  summary: string | null;
  targetPeople: string | null;
  eligibilityConditions: string | null;
  benefitDetail: string | null;
  amount: string | null;
  applicationMethod: string | null;
  requiredDocuments: string | null;
  deadline: string | null;
  contactDepartment: string | null;
  contactPhone: string | null;
  contactUrl: string | null;
  officialUrl: string | null;
  sourceQuote: string | null;
  extractionConfidence: number | null;
  riskFlags: string[];
  diffSummary: string | null;
  oldProgramId: string | null;
  reviewerNotes: string | null;
  createdAt: string;
  sourceName: string | null;
}

const CANDIDATE_SELECT =
  "id, candidate_status, change_type, municipality_name, municipality_id, prefecture, " +
  "category, title, summary, target_people, eligibility_conditions, benefit_detail, " +
  "amount, application_method, required_documents, deadline, contact_department, " +
  "contact_phone, contact_url, official_url, source_quote, extraction_confidence, " +
  "risk_flags, diff_summary, old_program_id, reviewer_notes, created_at, " +
  "crawler_sources ( name )";

function mapCandidate(r: Record<string, unknown>): CandidateAdmin {
  const src = r.crawler_sources as { name?: string } | null;
  return {
    id: String(r.id),
    candidateStatus: (r.candidate_status as CandidateStatus) ?? "pending",
    changeType: (r.change_type as ChangeType) ?? "new",
    municipalityName: (r.municipality_name as string | null) ?? null,
    municipalityId: (r.municipality_id as string | null) ?? null,
    prefecture: (r.prefecture as string | null) ?? null,
    category: (r.category as string | null) ?? null,
    title: String(r.title ?? ""),
    summary: (r.summary as string | null) ?? null,
    targetPeople: (r.target_people as string | null) ?? null,
    eligibilityConditions: (r.eligibility_conditions as string | null) ?? null,
    benefitDetail: (r.benefit_detail as string | null) ?? null,
    amount: (r.amount as string | null) ?? null,
    applicationMethod: (r.application_method as string | null) ?? null,
    requiredDocuments: (r.required_documents as string | null) ?? null,
    deadline: (r.deadline as string | null) ?? null,
    contactDepartment: (r.contact_department as string | null) ?? null,
    contactPhone: (r.contact_phone as string | null) ?? null,
    contactUrl: (r.contact_url as string | null) ?? null,
    officialUrl: (r.official_url as string | null) ?? null,
    sourceQuote: (r.source_quote as string | null) ?? null,
    extractionConfidence:
      typeof r.extraction_confidence === "number" ? r.extraction_confidence : null,
    riskFlags: (r.risk_flags as string[] | null) ?? [],
    diffSummary: (r.diff_summary as string | null) ?? null,
    oldProgramId: (r.old_program_id as string | null) ?? null,
    reviewerNotes: (r.reviewer_notes as string | null) ?? null,
    createdAt: String(r.created_at ?? ""),
    sourceName: src?.name ?? null,
  };
}

export interface CandidateFilter {
  status?: CandidateStatus | "all";
  changeType?: ChangeType | "all";
  municipalityName?: string;
  category?: string;
  limit?: number;
}

export async function fetchCandidates(
  f: CandidateFilter = {},
): Promise<CandidateAdmin[]> {
  // confidence 低い順（null は最後）→ 危ういものから確認できる。
  let q = client()
    .from("support_program_candidates")
    .select(CANDIDATE_SELECT)
    .order("extraction_confidence", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(f.limit ?? 200);
  const status = f.status ?? "pending";
  if (status !== "all") q = q.eq("candidate_status", status);
  if (f.changeType && f.changeType !== "all") q = q.eq("change_type", f.changeType);
  if (f.municipalityName) q = q.eq("municipality_name", f.municipalityName);
  if (f.category) q = q.eq("category", f.category);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapCandidate);
}

/** 候補の編集可能フィールド（snake_case）を部分更新。 */
export type CandidatePatch = Partial<{
  category: string | null;
  title: string;
  summary: string | null;
  target_people: string | null;
  eligibility_conditions: string | null;
  benefit_detail: string | null;
  amount: string | null;
  application_method: string | null;
  required_documents: string | null;
  deadline: string | null;
  contact_department: string | null;
  contact_phone: string | null;
  contact_url: string | null;
  official_url: string | null;
  municipality_id: string | null;
  reviewer_notes: string | null;
}>;

export async function updateCandidate(id: string, patch: CandidatePatch): Promise<void> {
  const { error } = await client()
    .from("support_program_candidates")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

async function setCandidateStatus(
  id: string,
  status: CandidateStatus,
  reviewerNotes?: string,
): Promise<void> {
  const sb = client();
  const { data: auth } = await sb.auth.getUser();
  const patch: Record<string, unknown> = {
    candidate_status: status,
    reviewed_by: auth.user?.id ?? null,
    reviewed_at: new Date().toISOString(),
  };
  if (reviewerNotes !== undefined) patch.reviewer_notes = reviewerNotes;
  const { error } = await sb
    .from("support_program_candidates")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function rejectCandidate(id: string, notes?: string): Promise<void> {
  await setCandidateStatus(id, "rejected", notes);
}

export async function markNeedsMoreInfo(id: string, notes?: string): Promise<void> {
  await setCandidateStatus(id, "needs_more_info", notes);
}

// ---- 承認 → 公開 support_programs へ反映 -----------------------------------
export interface ApproveOptions {
  /** 公開ステータス（既定 draft）。published は品質ゲートを満たす場合のみ DB が許可。 */
  publish?: boolean;
  /** 任意の slug 上書き。未指定なら自治体＋カテゴリ＋候補IDで生成。 */
  slug?: string;
  /** 紐づけるカテゴリ slug（categories.slug）。任意。 */
  categorySlug?: string;
}

export interface ApproveResult {
  programId: string;
  slug: string;
  status: "draft" | "published";
}

function confidenceLabel(c: number | null): "high" | "medium" | "low" {
  if (c == null) return "medium";
  if (c >= 0.7) return "high";
  if (c >= 0.4) return "medium";
  return "low";
}

/**
 * 候補を承認し、公開 support_programs へ upsert（updated は old_program_id を更新、
 * new は新規作成）。承認時に support_revisions（candidate_id/diff_summary/source_url 付き）を残す。
 * 公開ページの即時 revalidate も行う。
 */
export async function approveCandidate(
  c: CandidateAdmin,
  opts: ApproveOptions = {},
): Promise<ApproveResult> {
  const sb = client();
  if (!c.municipalityId) {
    throw new Error(
      "自治体が未解決です。対象の crawler_source に自治体（municipality）を紐付けてから承認してください。",
    );
  }

  // slug 生成のため自治体・都道府県 slug を取得。
  const { data: muni, error: muniErr } = await sb
    .from("municipalities")
    .select("slug, prefecture:prefectures!inner ( slug )")
    .eq("id", c.municipalityId)
    .maybeSingle();
  if (muniErr) throw new Error(muniErr.message);
  const muniRow = muni as
    | { slug: string; prefecture: { slug: string } | null }
    | null;
  const prefSlug = muniRow?.prefecture?.slug ?? "jp";
  const citySlug = muniRow?.slug ?? "city";

  const status: "draft" | "published" = opts.publish ? "published" : "draft";
  const programPayload: Record<string, unknown> = {
    municipality_id: c.municipalityId,
    title: c.title,
    summary: c.summary ?? c.title,
    target_people: c.targetPeople ?? c.eligibilityConditions ?? "",
    benefit_amount_text: c.amount,
    application_deadline_text: c.deadline,
    application_method_text: c.applicationMethod ?? "",
    required_documents_text: c.requiredDocuments,
    contact_name: c.contactDepartment,
    contact_phone: c.contactPhone,
    contact_url: c.contactUrl,
    official_url: c.officialUrl ?? "",
    last_official_checked_at: todayJst(),
    source_confidence: confidenceLabel(c.extractionConfidence),
    status,
  };
  if (status === "published") programPayload.published_at = new Date().toISOString();

  let programId: string;
  let slug: string;

  if (c.changeType === "updated" && c.oldProgramId) {
    // 既存制度を更新（slug は維持）。
    const { data: existing } = await sb
      .from("support_programs")
      .select("slug")
      .eq("id", c.oldProgramId)
      .maybeSingle();
    slug = (existing as { slug?: string } | null)?.slug ?? "";
    const { error } = await sb
      .from("support_programs")
      .update(programPayload)
      .eq("id", c.oldProgramId);
    if (error) throw new Error(error.message);
    programId = c.oldProgramId;
  } else {
    // 新規作成。slug は自治体＋カテゴリ＋候補ID。
    const base = buildSupportSlug(prefSlug, citySlug, c.category ?? "support");
    slug = (opts.slug?.trim() || `${base}-${c.id.slice(0, 8)}`).toLowerCase();
    const { data, error } = await sb
      .from("support_programs")
      .insert({ ...programPayload, slug })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    programId = (data as { id: string }).id;
  }

  // カテゴリ紐付け（任意・解決できた場合のみ）。
  const catSlug = opts.categorySlug ?? c.category ?? undefined;
  if (catSlug) {
    const { data: cat } = await sb
      .from("categories")
      .select("id")
      .eq("slug", catSlug)
      .maybeSingle();
    const catId = (cat as { id?: string } | null)?.id;
    if (catId) {
      await sb
        .from("support_program_categories")
        .upsert(
          { support_program_id: programId, category_id: catId },
          { onConflict: "support_program_id,category_id" },
        );
    }
  }

  // 改訂履歴（candidate_id/diff_summary/source_url 付き）。
  const { data: auth } = await sb.auth.getUser();
  await sb.from("support_revisions").insert({
    support_program_id: programId,
    changed_by: auth.user?.id ?? null,
    change_type: c.changeType === "updated" ? "crawler_update" : "crawler_create",
    change_summary: `クローラ候補を承認（${c.changeType}）`,
    candidate_id: c.id,
    diff_summary: c.diffSummary,
    source_url: c.officialUrl,
    after_json: { title: c.title, official_url: c.officialUrl, status },
  });

  // 候補を approved に。
  await setCandidateStatus(c.id, "approved");

  // 公開ページの即時 revalidate（失敗しても承認は成立）。
  await revalidate([
    "/",
    `/supports/${slug}`,
    `/${prefSlug}`,
    `/${prefSlug}/${citySlug}`,
  ]);

  return { programId, slug, status };
}

async function revalidate(paths: string[]): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return;
  try {
    await fetch("/api/admin/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ paths }),
    });
  } catch {
    // ISR の時間経過でも追従するため握りつぶす。
  }
}

// ---- 実行ログ --------------------------------------------------------------
export interface CrawlerRunAdmin {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  trigger: string;
  skipReason: string | null;
  totalSources: number;
  totalUrlsChecked: number;
  totalChangedDocuments: number;
  totalCandidatesCreated: number;
  totalErrors: number;
  errorSummary: unknown;
}

export async function fetchCrawlerRuns(limit = 20): Promise<CrawlerRunAdmin[]> {
  const { data, error } = await client()
    .from("crawler_runs")
    .select(
      "id, started_at, finished_at, status, trigger, skip_reason, total_sources, " +
        "total_urls_checked, total_changed_documents, total_candidates_created, " +
        "total_errors, error_summary",
    )
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    startedAt: String(r.started_at ?? ""),
    finishedAt: (r.finished_at as string | null) ?? null,
    status: String(r.status ?? ""),
    trigger: String(r.trigger ?? ""),
    skipReason: (r.skip_reason as string | null) ?? null,
    totalSources: Number(r.total_sources ?? 0),
    totalUrlsChecked: Number(r.total_urls_checked ?? 0),
    totalChangedDocuments: Number(r.total_changed_documents ?? 0),
    totalCandidatesCreated: Number(r.total_candidates_created ?? 0),
    totalErrors: Number(r.total_errors ?? 0),
    errorSummary: r.error_summary ?? null,
  }));
}

// ---- 手動実行（server route に委譲） ---------------------------------------
export interface ManualRunResult {
  status: string;
  sources: number;
  urlsChecked: number;
  changedDocuments: number;
  candidatesCreated: number;
  errors: number;
  skipReason: string | null;
}

export async function triggerManualRun(sourceId?: string): Promise<ManualRunResult> {
  const sb = client();
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("ログインが必要です");
  const res = await fetch("/api/admin/crawler/run", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(sourceId ? { sourceId } : {}),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `手動実行に失敗しました (${res.status})`);
  }
  return (await res.json()) as ManualRunResult;
}

// ---- 取得ページ（変更ページ一覧） -----------------------------------------
export interface CrawledDocAdmin {
  id: string;
  url: string;
  canonicalUrl: string | null;
  title: string | null;
  contentType: string | null;
  statusCode: number | null;
  crawlStatus: CrawlStatus | string;
  isChanged: boolean;
  changedAt: string | null;
  fetchedAt: string | null;
  errorMessage: string | null;
  sourceName: string | null;
  municipalityName: string | null;
  prefecture: string | null;
}

export interface CrawledDocFilter {
  /** 既定 true＝変更があったページのみ。false で全件。 */
  changedOnly?: boolean;
  crawlStatus?: CrawlStatus | "all";
  sourceId?: string;
  /** URL / タイトルの部分一致。 */
  q?: string;
  limit?: number;
}

const DOC_SELECT =
  "id, url, canonical_url, title, content_type, status_code, crawl_status, " +
  "is_changed, changed_at, fetched_at, error_message, source_id, " +
  "crawler_sources ( name, municipality_name, prefecture )";

function mapDoc(r: Record<string, unknown>): CrawledDocAdmin {
  const src = r.crawler_sources as
    | { name?: string; municipality_name?: string | null; prefecture?: string | null }
    | null;
  return {
    id: String(r.id),
    url: String(r.url ?? ""),
    canonicalUrl: (r.canonical_url as string | null) ?? null,
    title: (r.title as string | null) ?? null,
    contentType: (r.content_type as string | null) ?? null,
    statusCode: typeof r.status_code === "number" ? r.status_code : null,
    crawlStatus: String(r.crawl_status ?? ""),
    isChanged: Boolean(r.is_changed),
    changedAt: (r.changed_at as string | null) ?? null,
    fetchedAt: (r.fetched_at as string | null) ?? null,
    errorMessage: (r.error_message as string | null) ?? null,
    sourceName: src?.name ?? null,
    municipalityName: src?.municipality_name ?? null,
    prefecture: src?.prefecture ?? null,
  };
}

export async function fetchCrawledDocuments(
  f: CrawledDocFilter = {},
): Promise<CrawledDocAdmin[]> {
  let q = client()
    .from("crawled_documents")
    .select(DOC_SELECT)
    .order("changed_at", { ascending: false, nullsFirst: false })
    .order("fetched_at", { ascending: false, nullsFirst: false })
    .limit(f.limit ?? 300);
  if (f.changedOnly !== false) q = q.eq("is_changed", true);
  if (f.crawlStatus && f.crawlStatus !== "all") q = q.eq("crawl_status", f.crawlStatus);
  if (f.sourceId) q = q.eq("source_id", f.sourceId);
  if (f.q && f.q.trim()) {
    // PostgREST or() の区切り文字を壊さないよう LIKE エスケープ＋記号除去。
    const term = escapeLike(f.q.trim()).replace(/[(),*]/g, "");
    if (term) q = q.or(`url.ilike.%${term}%,title.ilike.%${term}%`);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapDoc);
}
