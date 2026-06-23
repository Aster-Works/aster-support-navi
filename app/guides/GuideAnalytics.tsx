"use client";

import { useEffect } from "react";
import { trackEvent } from "@/src/lib/analytics";

/** guide_view: ガイド記事が表示された時に1回だけ発火（SEO流入ファネルの入口計測）。 */
export function GuideAnalytics({ guide }: { guide: string }) {
  useEffect(() => {
    trackEvent("guide_view", { guide, source: "guide_article" });
  }, [guide]);
  return null;
}
