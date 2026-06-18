import type { Municipality } from "@/app/lib/data/types";

/** 東京23区。officialSiteUrl は各区公式サイトをWebFetchで確認したルート。
 *  intro は自治体ページ冒頭の紹介（断定しない）。制度を持つ区が active。 */
export const municipalities: Municipality[] = [
  { slug: "chiyoda", prefectureSlug: "tokyo", name: "千代田区", nameKana: "ちよだく", officialSiteUrl: "https://www.city.chiyoda.lg.jp/", intro: "千代田区に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。" },
  { slug: "chuo", prefectureSlug: "tokyo", name: "中央区", nameKana: "ちゅうおうく", officialSiteUrl: "https://www.city.chuo.lg.jp/", intro: "中央区に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。" },
  { slug: "minato", prefectureSlug: "tokyo", name: "港区", nameKana: "みなとく", officialSiteUrl: "https://www.city.minato.tokyo.jp/", intro: "港区に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。" },
  { slug: "shinjuku", prefectureSlug: "tokyo", name: "新宿区", nameKana: "しんじゅくく", officialSiteUrl: "https://www.city.shinjuku.lg.jp/", intro: "新宿区に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。" },
  { slug: "bunkyo", prefectureSlug: "tokyo", name: "文京区", nameKana: "ぶんきょうく", officialSiteUrl: "https://www.city.bunkyo.lg.jp/", intro: "文京区に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。" },
  { slug: "taito", prefectureSlug: "tokyo", name: "台東区", nameKana: "たいとうく", officialSiteUrl: "https://www.city.taito.lg.jp/", intro: "台東区に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。" },
  { slug: "sumida", prefectureSlug: "tokyo", name: "墨田区", nameKana: "すみだく", officialSiteUrl: "https://www.city.sumida.lg.jp/", intro: "墨田区に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。" },
  { slug: "koto", prefectureSlug: "tokyo", name: "江東区", nameKana: "こうとうく", officialSiteUrl: "https://www.city.koto.lg.jp/", intro: "江東区に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。" },
  { slug: "shinagawa", prefectureSlug: "tokyo", name: "品川区", nameKana: "しながわく", officialSiteUrl: "https://www.city.shinagawa.tokyo.jp/", intro: "品川区に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。" },
  { slug: "meguro", prefectureSlug: "tokyo", name: "目黒区", nameKana: "めぐろく", officialSiteUrl: "https://www.city.meguro.tokyo.jp/", intro: "目黒区に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。" },
  { slug: "ota", prefectureSlug: "tokyo", name: "大田区", nameKana: "おおたく", officialSiteUrl: "https://www.city.ota.tokyo.jp/", intro: "大田区に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。" },
  { slug: "setagaya", prefectureSlug: "tokyo", name: "世田谷区", nameKana: "せたがやく", officialSiteUrl: "https://www.city.setagaya.lg.jp/", intro: "世田谷区に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。" },
  { slug: "shibuya", prefectureSlug: "tokyo", name: "渋谷区", nameKana: "しぶやく", officialSiteUrl: "https://www.city.shibuya.tokyo.jp/", intro: "渋谷区に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。" },
  { slug: "nakano", prefectureSlug: "tokyo", name: "中野区", nameKana: "なかのく", officialSiteUrl: "https://www.city.tokyo-nakano.lg.jp/", intro: "中野区に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。" },
  { slug: "suginami", prefectureSlug: "tokyo", name: "杉並区", nameKana: "すぎなみく", officialSiteUrl: "https://www.city.suginami.tokyo.jp/", intro: "杉並区に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。" },
  { slug: "toshima", prefectureSlug: "tokyo", name: "豊島区", nameKana: "としまく", officialSiteUrl: "https://www.city.toshima.lg.jp/", intro: "豊島区に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。" },
  { slug: "kita", prefectureSlug: "tokyo", name: "北区", nameKana: "きたく", officialSiteUrl: "https://www.city.kita.lg.jp/", intro: "北区に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。" },
  { slug: "arakawa", prefectureSlug: "tokyo", name: "荒川区", nameKana: "あらかわく", officialSiteUrl: "https://www.city.arakawa.tokyo.jp/", intro: "荒川区に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。" },
  { slug: "itabashi", prefectureSlug: "tokyo", name: "板橋区", nameKana: "いたばしく", officialSiteUrl: "https://www.city.itabashi.tokyo.jp/", intro: "板橋区に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。" },
  { slug: "nerima", prefectureSlug: "tokyo", name: "練馬区", nameKana: "ねりまく", officialSiteUrl: "https://www.city.nerima.tokyo.jp/", intro: "練馬区に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。" },
  { slug: "adachi", prefectureSlug: "tokyo", name: "足立区", nameKana: "あだちく", officialSiteUrl: "https://www.city.adachi.tokyo.jp/", intro: "足立区に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。" },
  { slug: "katsushika", prefectureSlug: "tokyo", name: "葛飾区", nameKana: "かつしかく", officialSiteUrl: "https://www.city.katsushika.lg.jp/", intro: "葛飾区に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。" },
  { slug: "edogawa", prefectureSlug: "tokyo", name: "江戸川区", nameKana: "えどがわく", officialSiteUrl: "https://www.city.edogawa.tokyo.jp/", intro: "江戸川区に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。" },
];
