import { REGION_MAPS } from "@/app/data/regionMaps";

/** 地方名（北海道／東北／…）に対応する日本地図シルエットを currentColor で描く。
 *  装飾用のため aria-hidden。未知の地方名なら何も描かない（レイアウトは崩さない）。 */
export function RegionMap({
  region,
  className,
}: {
  region: string;
  className?: string;
}) {
  const shape = REGION_MAPS[region];
  if (!shape) return null;

  return (
    <svg
      viewBox={shape.viewBox}
      className={className}
      fill="currentColor"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      {shape.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
