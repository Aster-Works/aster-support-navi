import type { Municipality, Prefecture } from "@/app/lib/data/types";

export interface RegionGroup {
  slug: string;
  name: string;
  munis: Municipality[];
}

export interface AreaPrefecture {
  slug: string;
  name: string;
  nameKana?: string;
  region: string;
  munis: Municipality[];
}

export interface AreaGroup {
  slug: string;
  name: string;
  prefectures: AreaPrefecture[];
  municipalityCount: number;
}

const REGION_ORDER = [
  "北海道",
  "東北",
  "関東",
  "中部",
  "近畿",
  "中国",
  "四国",
  "九州",
];

const PREFECTURE_ORDER = [
  "hokkaido",
  "aomori",
  "iwate",
  "miyagi",
  "akita",
  "yamagata",
  "fukushima",
  "ibaraki",
  "tochigi",
  "gunma",
  "saitama",
  "chiba",
  "tokyo",
  "kanagawa",
  "niigata",
  "toyama",
  "ishikawa",
  "fukui",
  "yamanashi",
  "nagano",
  "gifu",
  "shizuoka",
  "aichi",
  "mie",
  "shiga",
  "kyoto",
  "osaka",
  "hyogo",
  "nara",
  "wakayama",
  "tottori",
  "shimane",
  "okayama",
  "hiroshima",
  "yamaguchi",
  "tokushima",
  "kagawa",
  "ehime",
  "kochi",
  "fukuoka",
  "saga",
  "nagasaki",
  "kumamoto",
  "oita",
  "miyazaki",
  "kagoshima",
  "okinawa",
];

const orderOf = (values: string[], value: string) => {
  const idx = values.indexOf(value);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
};

const regionSlug = (name: string) =>
  name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "-");

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

/** 制度あり自治体を「地方 → 都道府県」にまとめる（エリア選択UI用）。 */
export function buildAreaGroups(
  active: Municipality[],
  prefectures: Prefecture[],
): AreaGroup[] {
  const byPref = new Map<string, Municipality[]>();
  for (const m of active) {
    const arr = byPref.get(m.prefectureSlug) ?? [];
    arr.push(m);
    byPref.set(m.prefectureSlug, arr);
  }

  const byRegion = new Map<string, AreaPrefecture[]>();
  for (const p of prefectures) {
    const munis = byPref.get(p.slug) ?? [];
    if (munis.length === 0) continue;

    const region = p.region ?? "その他";
    const arr = byRegion.get(region) ?? [];
    arr.push({
      slug: p.slug,
      name: p.name,
      nameKana: p.nameKana,
      region,
      munis: [...munis].sort((a, b) =>
        (a.nameKana ?? a.name).localeCompare(b.nameKana ?? b.name, "ja"),
      ),
    });
    byRegion.set(region, arr);
  }

  return [...byRegion.entries()]
    .map(([name, prefs]) => {
      const prefecturesForRegion = [...prefs].sort((a, b) => {
        const byOrder =
          orderOf(PREFECTURE_ORDER, a.slug) -
          orderOf(PREFECTURE_ORDER, b.slug);
        return byOrder || a.name.localeCompare(b.name, "ja");
      });
      return {
        slug: regionSlug(name),
        name,
        prefectures: prefecturesForRegion,
        municipalityCount: prefecturesForRegion.reduce(
          (sum, p) => sum + p.munis.length,
          0,
        ),
      };
    })
    .sort((a, b) => {
      const byOrder = orderOf(REGION_ORDER, a.name) - orderOf(REGION_ORDER, b.name);
      return byOrder || a.name.localeCompare(b.name, "ja");
    });
}
