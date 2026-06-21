import Link from "next/link";
import { ArrowRight, Building2, MapPinned } from "lucide-react";
import type { AreaGroup } from "@/app/lib/region";

type AreaExplorerProps = {
  groups: AreaGroup[];
  compact?: boolean;
};

export function AreaExplorer({ groups, compact = false }: AreaExplorerProps) {
  if (groups.length === 0) return null;

  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
        <li key={group.slug} className="aw-card h-full">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ok-soft text-ok">
              <MapPinned className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-navy">{group.name}</h3>
              <p className="mt-0.5 text-[12px] leading-6 text-charcoal/70">
                {group.prefectures.length}都道府県・{group.municipalityCount}
                自治体を掲載中
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {group.prefectures.map((prefecture) => (
              <Link
                key={prefecture.slug}
                href={`/${prefecture.slug}`}
                className="group/pref flex min-h-12 items-center justify-between gap-3 rounded-xl border border-soft-gray bg-white px-3.5 py-2.5 text-left transition-colors hover:border-ok/35 hover:bg-ok-soft/35"
              >
                <span className="min-w-0">
                  <span className="block text-[14px] font-bold leading-6 text-navy">
                    {prefecture.name}
                  </span>
                  {!compact && (
                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-charcoal/75">
                      <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {prefecture.munis.length}自治体
                    </span>
                  )}
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-charcoal/35 transition-transform group-hover/pref:translate-x-0.5 group-hover/pref:text-ok"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
