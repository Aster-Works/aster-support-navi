import type { Prefecture } from "@/app/lib/data/types";

/** MVP は東京都のみ。Phase 4 で政令指定都市へ拡張。 */
export const prefectures: Prefecture[] = [
  {
    slug: "tokyo",
    name: "東京都",
    nameKana: "とうきょうと",
    region: "関東",
  },
];
