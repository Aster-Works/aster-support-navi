"use client";

import { ExternalLink } from "lucide-react";
import { safeHost, trackEvent } from "@/src/lib/analytics";

/** 公式ページへの外部リンク。新規タブ・noopener。YMYL の最終確認先。
 *  official_link_click: 外部公式リンクをクリックした時に発火。
 *  URLはドメインだけを送信し、パス・クエリは送らない。 */
export function OfficialLink({
  url,
  label = "公式ページで確認する",
  className = "btn-primary",
  supportId,
  supportTitle,
  category,
  municipality,
}: {
  url: string;
  label?: string;
  className?: string;
  supportId?: string;
  supportTitle?: string;
  category?: string;
  municipality?: string;
}) {
  const outboundDomain = safeHost(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={className}
      onClick={() =>
        trackEvent("official_link_click", {
          support_id: supportId,
          support_title: supportTitle,
          category,
          municipality,
          outbound_url_domain: outboundDomain,
        })
      }
    >
      {label}
      <ExternalLink className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">（公式サイト・新しいタブで開きます）</span>
    </a>
  );
}
