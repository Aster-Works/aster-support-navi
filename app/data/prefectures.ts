import type { Prefecture } from "@/app/lib/data/types";

/** MVP は東京都のみ。Phase 4 で政令指定都市へ拡張。 */
export const prefectures: Prefecture[] = [
  { slug: "tokyo", name: "東京都", nameKana: "とうきょうと", region: "関東" },
  { slug: "kanagawa", name: "神奈川県", nameKana: "かながわけん", region: "関東" },
  { slug: "osaka", name: "大阪府", nameKana: "おおさかふ", region: "近畿" },
  { slug: "aichi", name: "愛知県", nameKana: "あいちけん", region: "中部" },
  { slug: "hokkaido", name: "北海道", nameKana: "ほっかいどう", region: "北海道" },
  { slug: "fukuoka", name: "福岡県", nameKana: "ふくおかけん", region: "九州" },
  { slug: "hyogo", name: "兵庫県", nameKana: "ひょうごけん", region: "近畿" },
  { slug: "kyoto", name: "京都府", nameKana: "きょうとふ", region: "近畿" },
];
