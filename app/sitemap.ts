import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/app/lib/site";
import {
  getAllPublishedPrograms,
  getActiveMunicipalityParams,
  getLifeEventParams,
  getPrefectures,
  getGuides,
  getPresentCategories,
} from "@/app/lib/data";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [prefs, muniParams, eventParams, programs, guides, presentCategories] =
    await Promise.all([
      getPrefectures(),
      getActiveMunicipalityParams(),
      getLifeEventParams(),
      getAllPublishedPrograms(),
      getGuides(),
      getPresentCategories(),
    ]);

  // 自治体ごとの最終更新日（制度の最終確認日の最大）。
  const muniLastMod = new Map<string, string>();
  for (const p of programs) {
    const key = `${p.prefectureSlug}/${p.municipalitySlug}`;
    const cur = muniLastMod.get(key);
    if (!cur || p.lastOfficialCheckedAt > cur) {
      muniLastMod.set(key, p.lastOfficialCheckedAt);
    }
  }

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/area"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/compare"), changeFrequency: "weekly", priority: 0.5 },
    { url: absoluteUrl("/guides"), changeFrequency: "weekly", priority: 0.6 },
    { url: absoluteUrl("/help"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/pro"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.4 },
    {
      url: absoluteUrl("/disclaimer"),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.2 },
  ];

  // 公開制度を持つ自治体がある都道府県のみ（薄いインデックスを避ける）。
  const activePrefSlugs = new Set(muniParams.map((m) => m.prefecture));
  const prefPages: MetadataRoute.Sitemap = prefs
    .filter((pf) => activePrefSlugs.has(pf.slug))
    .map((pf) => ({
      url: absoluteUrl(`/${pf.slug}`),
      changeFrequency: "weekly",
      priority: 0.6,
    }));

  const muniPages: MetadataRoute.Sitemap = muniParams.map((m) => ({
    url: absoluteUrl(`/${m.prefecture}/${m.city}`),
    lastModified: muniLastMod.get(`${m.prefecture}/${m.city}`),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const eventPages: MetadataRoute.Sitemap = eventParams.map((e) => ({
    url: absoluteUrl(`/${e.prefecture}/${e.city}/${e.lifeEvent}`),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const supportPages: MetadataRoute.Sitemap = programs.map((p) => ({
    url: absoluteUrl(`/supports/${p.slug}`),
    lastModified: p.lastOfficialCheckedAt,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const guidePages: MetadataRoute.Sitemap = guides.map((g) => ({
    url: absoluteUrl(`/guides/${g.slug}`),
    lastModified: g.updatedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const comparePages: MetadataRoute.Sitemap = presentCategories.map((c) => ({
    url: absoluteUrl(`/compare/${c.slug}`),
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [
    ...staticPages,
    ...prefPages,
    ...muniPages,
    ...eventPages,
    ...supportPages,
    ...guidePages,
    ...comparePages,
  ];
}
