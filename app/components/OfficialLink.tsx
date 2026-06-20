"use client";

import { ExternalLink } from "lucide-react";
import { track, safeHost } from "@/app/lib/track";

/** 公式ページへの外部リンク。新規タブ・noopener。YMYL の最終確認先。
 *  クリックを official_link_clicked として計測（host のみ・機微情報は送らない）。 */
export function OfficialLink({
  url,
  label = "公式ページで確認する",
  className = "btn-primary",
  context,
}: {
  url: string;
  label?: string;
  className?: string;
  context?: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={className}
      onClick={() =>
        track("official_link_clicked", {
          ...(safeHost(url) ? { host: safeHost(url)! } : {}),
          ...(context ? { context } : {}),
        })
      }
    >
      {label}
      <ExternalLink className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">（公式サイト・新しいタブで開きます）</span>
    </a>
  );
}
