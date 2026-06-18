/** サイト全体の定数。OGP・canonical・sitemap の絶対URL生成、および
 *  法務ページの運営者情報（特定商取引法・個人情報保護法の公示）に使う。 */
export const SITE = {
  name: "Aster Support Navi",
  shortName: "Support Navi",
  brand: "Aster Works",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3040").replace(
    /\/$/,
    "",
  ),
  locale: "ja_JP",
  description:
    "自治体ごとに散らばる個人・世帯向けの支援制度を、住所と生活状況から探し、申請前に確認すべきことまで整理する生活支援ナビ。",
  tagline: "くらしの支援制度を、見落とさない。",

  /** 運営者表示（個人事業主・Aster Works）。最小開示方針：
   *  公示は屋号「Aster Works」にとどめ、代表者の氏名・住所・電話番号は
   *  特定商取引法に基づく請求があったときに遅滞なく開示する。 */
  operator: {
    tradeName: "Aster Works",
    legalKind: "個人事業主",
    serviceName: "Aster Works",
    contactEmail: "asterworks3322@gmail.com",
    disclosurePolicy:
      "特定商取引法に基づく請求があったときに、運営者の氏名・住所・電話番号を遅滞なく開示します。",
  },
} as const;

/** サイト内パスから絶対URLを作る（canonical / OG / sitemap）。 */
export function absoluteUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE.url}${p}`;
}
