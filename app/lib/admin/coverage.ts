/**
 * 自治体×テーマ 調査カバレッジ台帳（municipality_topic_coverage）の管理画面データアクセス。
 *
 * anon 用ポリシーは無い内部台帳（既定拒否）。crawler.ts と同じ規約:
 * ブラウザ Supabase + private.is_admin() RLS のみで認可し、service_role は使わない。
 */
import { getSupabase } from "@/app/lib/supabase";
import { escapeLike } from "@/app/lib/sanitize";

function client() {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase 未設定（管理画面はログインが必要です）");
  return sb;
}

export type ResearchStatus =
  | "not_started"
  | "researching"
  | "found"
  | "not_found_on_official_site"
  | "needs_review"
  | "not_applicable";

export interface CoverageAdmin {
  id: string;
  researchStatus: ResearchStatus | string;
  lastResearchedAt: string | null;
  officialSourceUrl: string | null;
  researchNote: string | null;
  municipalityName: string | null;
  prefectureName: string | null;
  topicName: string | null;
  topicSlug: string | null;
}

export interface CoverageFilter {
  researchStatus?: ResearchStatus | "all";
  topicSlug?: string;
  /** 自治体・都道府県名の部分一致。 */
  q?: string;
  limit?: number;
}

export interface CoverageTopicOption {
  slug: string;
  name: string;
}

const COVERAGE_SELECT =
  "id, research_status, last_researched_at, official_source_url, research_note, " +
  "municipalities ( name, prefectures ( name ) ), " +
  "support_topics ( name, slug )";

function mapCoverage(r: Record<string, unknown>): CoverageAdmin {
  const muni = r.municipalities as
    | { name?: string; prefectures?: { name?: string } | null }
    | null;
  const topic = r.support_topics as { name?: string; slug?: string } | null;
  return {
    id: String(r.id),
    researchStatus: String(r.research_status ?? ""),
    lastResearchedAt: (r.last_researched_at as string | null) ?? null,
    officialSourceUrl: (r.official_source_url as string | null) ?? null,
    researchNote: (r.research_note as string | null) ?? null,
    municipalityName: muni?.name ?? null,
    prefectureName: muni?.prefectures?.name ?? null,
    topicName: topic?.name ?? null,
    topicSlug: topic?.slug ?? null,
  };
}

export async function fetchCoverage(f: CoverageFilter = {}): Promise<CoverageAdmin[]> {
  let q = client()
    .from("municipality_topic_coverage")
    .select(COVERAGE_SELECT)
    .order("last_researched_at", { ascending: false, nullsFirst: false })
    .limit(f.limit ?? 5000);
  if (f.researchStatus && f.researchStatus !== "all") {
    q = q.eq("research_status", f.researchStatus);
  }
  if (f.q && f.q.trim()) {
    const term = escapeLike(f.q.trim()).replace(/[(),*]/g, "");
    if (term) q = q.ilike("municipalities.name", `%${term}%`);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  let rows = ((data ?? []) as unknown as Record<string, unknown>[]).map(mapCoverage);
  // topic は FK join でフィルタできないため（PostgREST embedded filter は対象外）、取得後に絞り込む。
  if (f.topicSlug) rows = rows.filter((r) => r.topicSlug === f.topicSlug);
  return rows;
}

export async function fetchCoverageTopics(): Promise<CoverageTopicOption[]> {
  const { data, error } = await client()
    .from("support_topics")
    .select("slug, name")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as CoverageTopicOption[];
}
