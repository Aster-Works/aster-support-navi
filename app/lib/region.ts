import type { Municipality, Prefecture } from "@/app/lib/data/types";

export interface RegionGroup {
  slug: string;
  name: string;
  munis: Municipality[];
}

/** 制度あり自治体を都道府県ごとにまとめる（東京を先頭、以降は名前順。各自治体はかな順）。
 *  opts.exclude で指定した都道府県は除外する（都道府県ページの「他の地域」用）。純関数。 */
export function buildRegionGroups(
  active: Municipality[],
  prefectures: Prefecture[],
  opts: { exclude?: string } = {},
): RegionGroup[] {
  const prefName = new Map(prefectures.map((p) => [p.slug, p.name]));
  const byPref = new Map<string, Municipality[]>();
  for (const m of active) {
    if (opts.exclude && m.prefectureSlug === opts.exclude) continue;
    const arr = byPref.get(m.prefectureSlug) ?? [];
    arr.push(m);
    byPref.set(m.prefectureSlug, arr);
  }
  return [...byPref.entries()]
    .map(([slug, munis]) => ({
      slug,
      name: prefName.get(slug) ?? slug,
      munis: [...munis].sort((a, b) =>
        (a.nameKana ?? a.name).localeCompare(b.nameKana ?? b.name, "ja"),
      ),
    }))
    .sort((a, b) =>
      a.slug === "tokyo"
        ? -1
        : b.slug === "tokyo"
          ? 1
          : a.name.localeCompare(b.name, "ja"),
    );
}
