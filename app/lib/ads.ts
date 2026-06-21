export const ADSENSE_CLIENT_ID = "ca-pub-1547495705896839";
export const ADSENSE_PUBLISHER_ID = "pub-1547495705896839";

export const ADSENSE_ENABLED =
  process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true";
export const ADSENSE_GUIDE_SLOT =
  process.env.NEXT_PUBLIC_ADSENSE_GUIDE_SLOT?.trim();

const ADSENSE_EXCLUDED_GUIDE_SLUGS = new Set(["single-parent-support"]);

export function isGuideAdExcluded(slug: string): boolean {
  return ADSENSE_EXCLUDED_GUIDE_SLUGS.has(slug);
}

export function canShowGuideAds(slug?: string): boolean {
  return (
    ADSENSE_ENABLED &&
    Boolean(ADSENSE_GUIDE_SLOT) &&
    (!slug || !isGuideAdExcluded(slug))
  );
}
