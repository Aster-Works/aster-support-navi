import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { JsonLd } from "@/app/components/JsonLd";
import { breadcrumbJsonLd, type Crumb } from "@/app/lib/seo";

/** 視覚的パンくず＋BreadcrumbList JSON-LD。最後の要素は現在地（リンクなし）。 */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <>
      <nav aria-label="パンくずリスト" className="aw-container pt-6">
        <ol className="flex flex-wrap items-center gap-1 text-[12px] text-charcoal/70">
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <li key={c.path} className="flex items-center gap-1">
                {i > 0 && (
                  <ChevronRight
                    className="h-3.5 w-3.5 text-charcoal/40"
                    aria-hidden="true"
                  />
                )}
                {isLast ? (
                  <span aria-current="page" className="font-medium text-charcoal">
                    {c.name}
                  </span>
                ) : (
                  <Link
                    href={c.path}
                    className="rounded transition-colors hover:text-fg hover:underline"
                  >
                    {c.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
    </>
  );
}
