"use client";

import { useEffect } from "react";
import { trackEvent } from "@/src/lib/analytics";

/** pro_view: Pro 案内ページが表示された時に1回だけ発火（収益ファネルの入口計測）。 */
export function ProPageAnalytics() {
  useEffect(() => {
    trackEvent("pro_view", { source: "pro_landing" });
  }, []);
  return null;
}
