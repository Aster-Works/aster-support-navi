"use client";

import { useEffect } from "react";
import { trackEvent } from "@/src/lib/analytics";

/** sample_pack_view: サンプル相談パックが表示された時に1回だけ発火。 */
export function SamplePackAnalytics({ sample }: { sample: string }) {
  useEffect(() => {
    trackEvent("sample_pack_view", { sample, source: "pro_sample" });
  }, [sample]);
  return null;
}
