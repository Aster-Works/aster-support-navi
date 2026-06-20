import Link from "next/link";
import type { RegionGroup } from "@/app/lib/region";

/** 制度あり自治体を都道府県ごとにチップ表示する（トップ／都道府県ページ共用）。 */
export function RegionBrowse({ groups }: { groups: RegionGroup[] }) {
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.slug}>
          <h3 className="text-[13px] font-bold text-navy">
            <Link href={`/${g.slug}`} className="hover:underline">
              {g.name}
            </Link>
            <span className="ml-2 text-[11px] font-normal text-charcoal/60">
              {g.munis.length}自治体
            </span>
          </h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {g.munis.map((m) => (
              <li key={`${m.prefectureSlug}-${m.slug}`}>
                <Link
                  href={`/${m.prefectureSlug}/${m.slug}`}
                  className="aw-chip"
                >
                  {m.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
