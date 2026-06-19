/**
 * データアクセス層（唯一のデータ入口）。
 * ページ・コンポーネントは seed を直接 import せず、必ずここを経由する。
 * 現在は型付き seed（同期）を非同期 API で包む。Phase 3 で Supabase 実装へ差し替えても
 * 呼び出し側（await 済み）を変えずに済む。
 */
import { prefectures } from "@/app/data/prefectures";
import { municipalities } from "@/app/data/municipalities";
import { categories } from "@/app/data/categories";
import { lifeEvents } from "@/app/data/lifeEvents";
import { programs } from "@/app/data/programs";
import { guides, type Guide } from "@/app/data/guides";
import {
  hasActiveDeadline,
  isPublishable,
  type Category,
  type LifeEvent,
  type Municipality,
  type Prefecture,
  type SupportProgram,
} from "@/app/lib/data/types";

/** 公開対象の制度のみ（不変条件 §3）。 */
const publishedPrograms: SupportProgram[] = programs.filter(isPublishable);

export interface ProgramFilters {
  prefectureSlug?: string;
  municipalitySlug?: string;
  categorySlug?: string;
  lifeEventSlug?: string;
  onlineOnly?: boolean;
  hasDeadline?: boolean;
  keyword?: string;
}

// ---- 都道府県 -------------------------------------------------------------
export async function getPrefectures(): Promise<Prefecture[]> {
  return prefectures;
}
export async function getPrefecture(
  slug: string,
): Promise<Prefecture | undefined> {
  return prefectures.find((p) => p.slug === slug);
}

// ---- 自治体 ---------------------------------------------------------------
export async function getMunicipalities(
  prefectureSlug?: string,
): Promise<Municipality[]> {
  return prefectureSlug
    ? municipalities.filter((m) => m.prefectureSlug === prefectureSlug)
    : municipalities;
}

export async function getMunicipality(
  prefectureSlug: string,
  citySlug: string,
): Promise<Municipality | undefined> {
  return municipalities.find(
    (m) => m.prefectureSlug === prefectureSlug && m.slug === citySlug,
  );
}

/** 公開制度を持つ自治体（＝ページを公開してよい active な自治体）。 */
export async function getActiveMunicipalities(
  prefectureSlug?: string,
): Promise<Municipality[]> {
  const activeSlugs = new Set(
    publishedPrograms.map((p) => `${p.prefectureSlug}/${p.municipalitySlug}`),
  );
  const list = prefectureSlug
    ? municipalities.filter((m) => m.prefectureSlug === prefectureSlug)
    : municipalities;
  return list.filter((m) => activeSlugs.has(`${m.prefectureSlug}/${m.slug}`));
}

export async function isActiveMunicipality(
  prefectureSlug: string,
  citySlug: string,
): Promise<boolean> {
  return publishedPrograms.some(
    (p) => p.prefectureSlug === prefectureSlug && p.municipalitySlug === citySlug,
  );
}

// ---- カテゴリ / 生活イベント ----------------------------------------------
export async function getCategories(): Promise<Category[]> {
  return [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
}
export async function getCategory(slug: string): Promise<Category | undefined> {
  return categories.find((c) => c.slug === slug);
}
export async function getLifeEvents(): Promise<LifeEvent[]> {
  return [...lifeEvents].sort((a, b) => a.sortOrder - b.sortOrder);
}
export async function getLifeEvent(
  slug: string,
): Promise<LifeEvent | undefined> {
  return lifeEvents.find((e) => e.slug === slug);
}

/** 公開制度が1件以上あるカテゴリのみ（比較ページの params 用）。 */
export async function getPresentCategories(): Promise<Category[]> {
  const present = new Set(publishedPrograms.flatMap((p) => p.categorySlugs));
  return (await getCategories()).filter((c) => present.has(c.slug));
}

/** ある自治体で実際に制度が存在するカテゴリのみ。 */
export async function getCategoriesForMunicipality(
  prefectureSlug: string,
  citySlug: string,
): Promise<Category[]> {
  const present = new Set(
    publishedPrograms
      .filter(
        (p) =>
          p.prefectureSlug === prefectureSlug &&
          p.municipalitySlug === citySlug,
      )
      .flatMap((p) => p.categorySlugs),
  );
  return (await getCategories()).filter((c) => present.has(c.slug));
}

/** ある自治体で制度が存在する生活イベントのみ。 */
export async function getLifeEventsForMunicipality(
  prefectureSlug: string,
  citySlug: string,
): Promise<LifeEvent[]> {
  const present = new Set(
    publishedPrograms
      .filter(
        (p) =>
          p.prefectureSlug === prefectureSlug &&
          p.municipalitySlug === citySlug,
      )
      .flatMap((p) => p.lifeEventSlugs),
  );
  return (await getLifeEvents()).filter((e) => present.has(e.slug));
}

// ---- 制度 -----------------------------------------------------------------
export async function getProgram(
  slug: string,
): Promise<SupportProgram | undefined> {
  return publishedPrograms.find((p) => p.slug === slug);
}

export async function getAllPublishedPrograms(): Promise<SupportProgram[]> {
  return publishedPrograms;
}

/** 純粋なフィルタ適用（テスト可能なように関数を分離）。 */
export function applyFilters(
  list: SupportProgram[],
  f: ProgramFilters,
): SupportProgram[] {
  let out = list;
  if (f.prefectureSlug)
    out = out.filter((p) => p.prefectureSlug === f.prefectureSlug);
  if (f.municipalitySlug)
    out = out.filter((p) => p.municipalitySlug === f.municipalitySlug);
  if (f.categorySlug)
    out = out.filter((p) => p.categorySlugs.includes(f.categorySlug!));
  if (f.lifeEventSlug)
    out = out.filter((p) => p.lifeEventSlugs.includes(f.lifeEventSlug!));
  if (f.onlineOnly) out = out.filter((p) => p.onlineApplicationAvailable);
  if (f.hasDeadline) out = out.filter(hasActiveDeadline);
  if (f.keyword) {
    const q = f.keyword.trim().toLowerCase();
    if (q) {
      out = out.filter((p) =>
        [
          p.title,
          p.summary,
          p.plainLanguageSummary ?? "",
          p.targetPeople,
          p.benefitAmountText ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
  }
  return out;
}

export async function getPrograms(
  f: ProgramFilters = {},
): Promise<SupportProgram[]> {
  return applyFilters(publishedPrograms, f);
}

export async function getProgramsByMunicipality(
  prefectureSlug: string,
  citySlug: string,
): Promise<SupportProgram[]> {
  return applyFilters(publishedPrograms, {
    prefectureSlug,
    municipalitySlug: citySlug,
  });
}

export async function getProgramsByLifeEvent(
  prefectureSlug: string,
  citySlug: string,
  lifeEventSlug: string,
): Promise<SupportProgram[]> {
  return applyFilters(publishedPrograms, {
    prefectureSlug,
    municipalitySlug: citySlug,
    lifeEventSlug,
  });
}

/** 制度キー（slug 末尾。例: child-allowance）で、全自治体の同種制度を集める。 */
export async function getProgramsByKey(key: string): Promise<SupportProgram[]> {
  return publishedPrograms.filter((p) => p.slug.endsWith(`-${key}`));
}

/** 制度キー（slug の `{pref}-{muni}-` を除いた末尾）を取り出す。 */
function programTypeKey(p: SupportProgram): string {
  return p.slug.slice(`${p.prefectureSlug}-${p.municipalitySlug}-`.length);
}

/** 生活イベントの関連制度を、制度種別ごとに代表1件へ畳んで返す（ガイドの関連制度一覧用）。
 *  自治体をまたいだ同種制度の重複を避け、短く保つ。 */
export async function getRepresentativeProgramsByLifeEvent(
  lifeEventSlug: string,
  limit = 8,
): Promise<SupportProgram[]> {
  const seen = new Set<string>();
  const out: SupportProgram[] = [];
  for (const p of applyFilters(publishedPrograms, { lifeEventSlug })) {
    const key = programTypeKey(p);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

// ---- ガイド記事 -----------------------------------------------------------
export async function getGuides(): Promise<Guide[]> {
  return [...guides].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function getGuide(slug: string): Promise<Guide | undefined> {
  return guides.find((g) => g.slug === slug);
}

/** 同じ自治体で、カテゴリ or 生活イベントが重なる関連制度（自分を除く）。 */
export async function getRelatedPrograms(
  program: SupportProgram,
  limit = 4,
): Promise<SupportProgram[]> {
  const cats = new Set(program.categorySlugs);
  const events = new Set(program.lifeEventSlugs);
  return publishedPrograms
    .filter(
      (p) =>
        p.slug !== program.slug &&
        p.municipalitySlug === program.municipalitySlug &&
        (p.categorySlugs.some((c) => cats.has(c)) ||
          p.lifeEventSlugs.some((e) => events.has(e))),
    )
    .slice(0, limit);
}

/** 最近更新された制度（最終確認日 desc）。 */
export async function getRecentlyUpdatedPrograms(
  limit = 6,
): Promise<SupportProgram[]> {
  return [...publishedPrograms]
    .sort((a, b) =>
      (b.updatedAt ?? b.lastOfficialCheckedAt).localeCompare(
        a.updatedAt ?? a.lastOfficialCheckedAt,
      ),
    )
    .slice(0, limit);
}

/** active 自治体 × その自治体に存在する生活イベント（params 生成用）。 */
export async function getLifeEventParams(): Promise<
  { prefecture: string; city: string; lifeEvent: string }[]
> {
  const seen = new Set<string>();
  const out: { prefecture: string; city: string; lifeEvent: string }[] = [];
  for (const p of publishedPrograms) {
    for (const le of p.lifeEventSlugs) {
      const key = `${p.prefectureSlug}/${p.municipalitySlug}/${le}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({
          prefecture: p.prefectureSlug,
          city: p.municipalitySlug,
          lifeEvent: le,
        });
      }
    }
  }
  return out;
}

/** 全 active 自治体（params 生成用）。 */
export async function getActiveMunicipalityParams(): Promise<
  { prefecture: string; city: string }[]
> {
  const seen = new Set<string>();
  const out: { prefecture: string; city: string }[] = [];
  for (const p of publishedPrograms) {
    const key = `${p.prefectureSlug}/${p.municipalitySlug}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ prefecture: p.prefectureSlug, city: p.municipalitySlug });
    }
  }
  return out;
}
