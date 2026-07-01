import Link from "next/link";
import { RegionMap } from "@/app/components/RegionMap";
import type { AreaGroup } from "@/app/lib/region";

type AreaExplorerProps = {
  groups: AreaGroup[];
  compact?: boolean;
};

/** 地方カードの一覧。各カードは「地方シルエット＋地方名＋都道府県リンク（中黒区切り）」で、
 *  Stitch のエリアセクション配置を踏襲する。compact=false のときは県名の後ろに掲載自治体数を添える。 */
export function AreaExplorer({ groups, compact = false }: AreaExplorerProps) {
  if (groups.length === 0) return null;

  return (
    <ul className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
        <li
          key={group.slug}
          className="aw-card flex h-full items-start gap-4 p-5"
        >
          <RegionMap
            region={group.name}
            className="mt-0.5 h-14 w-14 shrink-0 text-navy dark:text-white/85"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-[15px] font-bold text-fg">{group.name}</h3>
              <span className="shrink-0 text-[11px] text-charcoal/60">
                {group.prefectures.length}
                <span className="mx-0.5">/</span>
                {group.municipalityCount}自治体
              </span>
            </div>
            <div className="mt-2 flex flex-wrap text-[13px] leading-6 text-charcoal/85">
              {group.prefectures.map((prefecture, i) => (
                <span key={prefecture.slug} className="whitespace-nowrap">
                  <Link
                    href={`/${prefecture.slug}`}
                    className="rounded-sm underline-offset-2 transition-colors hover:text-navy hover:underline dark:hover:text-gold"
                  >
                    {prefecture.name}
                    {!compact && (
                      <span className="ml-0.5 text-[11px] text-charcoal/45">
                        ({prefecture.munis.length})
                      </span>
                    )}
                  </Link>
                  {i < group.prefectures.length - 1 && (
                    <span aria-hidden="true" className="mx-1.5 text-charcoal/25">
                      ・
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
