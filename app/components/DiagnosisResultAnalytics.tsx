"use client";

import { useEffect } from "react";
import { trackEvent } from "@/src/lib/analytics";

export function DiagnosisResultAnalytics({
  resultCount,
  prefecture,
  city,
  categoryCount,
}: {
  resultCount: number;
  prefecture?: string;
  city?: string;
  categoryCount: number;
}) {
  useEffect(() => {
    // diagnosis_complete: 診断結果（支援ルート）が表示された時に発火。
    trackEvent("diagnosis_complete", {
      result_count: resultCount,
      prefecture,
      city,
      category_count: categoryCount,
    });
  }, [categoryCount, city, prefecture, resultCount]);

  return null;
}

