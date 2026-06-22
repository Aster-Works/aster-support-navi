/**
 * Supabase 読み取りリポジトリ（公開制度のみ）と hybrid 合成。
 *
 * - `supabaseRepository`: Supabase content schema を読む。env 未設定／接続失敗時は seed へ
 *   グレースフルフォールバック（YMYL サイトの可用性優先）。DB が空（[]）の場合は空を返す
 *   （= 明示的に supabase モードを選んだ場合の正しい状態。hybrid なら seed で補完する）。
 * - `hybridRepository`: Supabase published を優先し、未登録 slug を seed で補完。
 *   ガイド記事は編集コンテンツのため Slice A では seed のままにする。
 *
 * 公開読み取りは anon キー + RLS（published のみ）で行う。service_role は使わない。
 */
import { cache } from "react";
import type { Guide } from "@/app/data/guides";
import { getServerReadClient } from "@/app/lib/supabase-server";
import type { SupportRepository } from "./repository";
import { seedRepository } from "./seedRepository";
import {
  isPublishable,
  type BenefitType,
  type Category,
  type LifeEvent,
  type Municipality,
  type Prefecture,
  type PublishStatus,
  type SourceConfidence,
  type SupportProgram,
} from "./types";

// ---- 行マッピング（snake_case DB → camelCase ドメイン） --------------------

type EmbeddedSlug = { slug: string } | null;

export interface ProgramRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  plain_language_summary: string | null;
  benefit_type: BenefitType;
  target_people: string;
  benefit_amount_text: string | null;
  application_deadline_text: string | null;
  application_period_end: string | null;
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
  uncertain_fields: string[] | null;
  disclaimer_note: string | null;
  status: PublishStatus;
  updated_at: string | null;
  municipality: { slug: string; prefecture: EmbeddedSlug } | null;
  categories: { category: EmbeddedSlug }[] | null;
  life_events: { life_event: EmbeddedSlug }[] | null;
}

const PROGRAM_SELECT = `
  id, slug, title, summary, plain_language_summary, benefit_type, target_people,
  benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, updated_at,
  municipality:municipalities!inner ( slug, prefecture:prefectures!inner ( slug ) ),
  categories:support_program_categories ( category:categories ( slug ) ),
  life_events:support_program_life_events ( life_event:life_events ( slug ) )
`;

function undef<T>(v: T | null | undefined): T | undefined {
  return v == null ? undefined : v;
}

export function mapProgram(r: ProgramRow): SupportProgram | null {
  const municipalitySlug = r.municipality?.slug;
  const prefectureSlug = r.municipality?.prefecture?.slug;
  if (!municipalitySlug || !prefectureSlug) return null; // 親が無い行は捨てる
  return {
    id: r.id,
    slug: r.slug,
    prefectureSlug,
    municipalitySlug,
    title: r.title,
    summary: r.summary,
    plainLanguageSummary: undef(r.plain_language_summary),
    categorySlugs: (r.categories ?? [])
      .map((c) => c.category?.slug)
      .filter((s): s is string => Boolean(s)),
    lifeEventSlugs: (r.life_events ?? [])
      .map((e) => e.life_event?.slug)
      .filter((s): s is string => Boolean(s)),
    benefitType: r.benefit_type,
    targetPeople: r.target_people,
    benefitAmountText: undef(r.benefit_amount_text),
    applicationDeadlineText: undef(r.application_deadline_text),
    applicationPeriodEnd: undef(r.application_period_end),
    applicationMethodText: r.application_method_text,
    requiredDocumentsText: undef(r.required_documents_text),
    onlineApplicationAvailable: undef(r.online_application_available),
    contactName: undef(r.contact_name),
    contactPhone: undef(r.contact_phone),
    contactUrl: undef(r.contact_url),
    officialUrl: r.official_url,
    officialSourceTitle: undef(r.official_source_title),
    lastOfficialCheckedAt: r.last_official_checked_at,
    sourceConfidence: r.source_confidence,
    uncertainFields: r.uncertain_fields ?? undefined,
    disclaimerNote: undef(r.disclaimer_note),
    status: r.status,
    updatedAt: undef(r.updated_at),
  };
}

// ---- フェッチ（per-request dedupe / 失敗時は null = unavailable） ----------

let warned = false;
function warnOnce(message: string, error?: unknown) {
  if (warned) return;
  warned = true;
  console.warn(`[supabaseRepository] ${message}`, error ?? "");
}

const PROGRAM_PAGE_SIZE = 1000;

/** published 制度。null = Supabase 利用不可（seed フォールバックの合図）、[] = 空。 */
const fetchPublishedPrograms = cache(
  async (): Promise<SupportProgram[] | null> => {
    const sb = getServerReadClient();
    if (!sb) return null;

    const rows: ProgramRow[] = [];
    for (let from = 0; ; from += PROGRAM_PAGE_SIZE) {
      const to = from + PROGRAM_PAGE_SIZE - 1;
      const { data, error } = await sb
        .from("support_programs")
        .select(PROGRAM_SELECT)
        .eq("status", "published")
        .order("slug", { ascending: true })
        .range(from, to);
      if (error) {
        warnOnce("制度の取得に失敗。seed にフォールバックします。", error.message);
        return null;
      }

      const page = (data ?? []) as unknown as ProgramRow[];
      rows.push(...page);
      if (page.length < PROGRAM_PAGE_SIZE) break;
    }

    // defense-in-depth: DB 側でも published のみ返るが、表示面ゲートを再適用する。
    return rows
      .map(mapProgram)
      .filter((p): p is SupportProgram => p !== null && isPublishable(p));
  },
);

const fetchPrefectures = cache(async (): Promise<Prefecture[] | null> => {
  const sb = getServerReadClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("prefectures")
    .select("slug, name, name_kana, region")
    .order("slug", { ascending: true });
  if (error) {
    warnOnce("都道府県の取得に失敗。", error.message);
    return null;
  }
  return (data ?? []).map((r) => ({
    slug: r.slug,
    name: r.name,
    nameKana: undef(r.name_kana),
    region: undef(r.region),
  }));
});

interface MunicipalityRow {
  slug: string;
  name: string;
  name_kana: string | null;
  official_site_url: string | null;
  population: number | null;
  intro: string | null;
  prefecture: { slug: string } | null;
}

const fetchMunicipalities = cache(async (): Promise<Municipality[] | null> => {
  const sb = getServerReadClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("municipalities")
    .select(
      "slug, name, name_kana, official_site_url, population, intro, prefecture:prefectures!inner ( slug )",
    )
    .order("slug", { ascending: true });
  if (error) {
    warnOnce("自治体の取得に失敗。", error.message);
    return null;
  }
  const rows = (data ?? []) as unknown as MunicipalityRow[];
  return rows
    .map((r): Municipality | null => {
      const prefectureSlug = r.prefecture?.slug;
      if (!prefectureSlug) return null;
      return {
        slug: r.slug,
        prefectureSlug,
        name: r.name,
        nameKana: undef(r.name_kana),
        officialSiteUrl: undef(r.official_site_url),
        population: undef(r.population),
        intro: undef(r.intro),
      };
    })
    .filter((m): m is Municipality => m !== null);
});

const fetchCategories = cache(async (): Promise<Category[] | null> => {
  const sb = getServerReadClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("categories")
    .select("slug, name, description, sort_order")
    .order("sort_order", { ascending: true })
    .order("slug", { ascending: true });
  if (error) {
    warnOnce("カテゴリの取得に失敗。", error.message);
    return null;
  }
  return (data ?? []).map((r) => ({
    slug: r.slug,
    name: r.name,
    description: undef(r.description),
    sortOrder: r.sort_order ?? 0,
  }));
});

const fetchLifeEvents = cache(async (): Promise<LifeEvent[] | null> => {
  const sb = getServerReadClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("life_events")
    .select("slug, name, description, icon, sort_order, common_checks")
    .order("sort_order", { ascending: true })
    .order("slug", { ascending: true });
  if (error) {
    warnOnce("生活イベントの取得に失敗。", error.message);
    return null;
  }
  return (data ?? []).map((r) => ({
    slug: r.slug,
    name: r.name,
    description: undef(r.description),
    icon: undef(r.icon),
    sortOrder: r.sort_order ?? 0,
    commonChecks: r.common_checks ?? undefined,
  }));
});

// ---- supabaseRepository（空はそのまま、unavailable は seed フォールバック） -

export const supabaseRepository: SupportRepository = {
  async getPrefectures() {
    return (await fetchPrefectures()) ?? seedRepository.getPrefectures();
  },
  async getMunicipalities() {
    return (await fetchMunicipalities()) ?? seedRepository.getMunicipalities();
  },
  async getCategories() {
    return (await fetchCategories()) ?? seedRepository.getCategories();
  },
  async getLifeEvents() {
    return (await fetchLifeEvents()) ?? seedRepository.getLifeEvents();
  },
  async getGuides(): Promise<Guide[]> {
    // ガイドは編集コンテンツ。Slice A では制度DBに含めず seed のまま。
    return seedRepository.getGuides();
  },
  async getPublishedPrograms() {
    return (
      (await fetchPublishedPrograms()) ??
      seedRepository.getPublishedPrograms()
    );
  },
};

// ---- hybridRepository（DB 優先 + seed 補完） ------------------------------

export function unionBySlug<T extends { slug: string }>(
  db: T[],
  seed: T[],
): T[] {
  const have = new Set(db.map((x) => x.slug));
  return [...db, ...seed.filter((x) => !have.has(x.slug))];
}

export function unionMunicipalities(
  db: Municipality[],
  seed: Municipality[],
): Municipality[] {
  const key = (m: Municipality) => `${m.prefectureSlug}/${m.slug}`;
  const have = new Set(db.map(key));
  return [...db, ...seed.filter((m) => !have.has(key(m)))];
}

export const hybridRepository: SupportRepository = {
  async getPrefectures() {
    const db = (await fetchPrefectures()) ?? [];
    return unionBySlug(db, await seedRepository.getPrefectures());
  },
  async getMunicipalities() {
    const db = (await fetchMunicipalities()) ?? [];
    return unionMunicipalities(db, await seedRepository.getMunicipalities());
  },
  async getCategories() {
    const db = (await fetchCategories()) ?? [];
    return unionBySlug(db, await seedRepository.getCategories());
  },
  async getLifeEvents() {
    const db = (await fetchLifeEvents()) ?? [];
    return unionBySlug(db, await seedRepository.getLifeEvents());
  },
  async getGuides(): Promise<Guide[]> {
    return seedRepository.getGuides();
  },
  async getPublishedPrograms() {
    const db = (await fetchPublishedPrograms()) ?? [];
    return unionBySlug(db, await seedRepository.getPublishedPrograms());
  },
};
