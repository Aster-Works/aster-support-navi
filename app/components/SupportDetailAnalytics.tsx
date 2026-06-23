"use client";

import { useEffect } from "react";
import { trackEvent } from "@/src/lib/analytics";

export function SupportDetailAnalytics({
  supportId,
  supportTitle,
  category,
  municipality,
}: {
  supportId: string;
  supportTitle: string;
  category?: string;
  municipality: string;
}) {
  useEffect(() => {
    // support_detail_view: 制度詳細ページを閲覧した時に発火。
    trackEvent("support_detail_view", {
      support_id: supportId,
      support_title: supportTitle,
      category,
      municipality,
    });
  }, [category, municipality, supportId, supportTitle]);

  return null;
}
