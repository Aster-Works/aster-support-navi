import { ExternalLink } from "lucide-react";

/** 公式ページへの外部リンク。新規タブ・noopener。YMYL の最終確認先。 */
export function OfficialLink({
  url,
  label = "公式ページで確認する",
  className = "btn-primary",
}: {
  url: string;
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={className}
    >
      {label}
      <ExternalLink className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">（公式サイト・新しいタブで開きます）</span>
    </a>
  );
}
