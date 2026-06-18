/** サイト全体の定数。OGP・canonical・sitemap の絶対URL生成に使う。 */
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
} as const;

/** サイト内パスから絶対URLを作る（canonical / OG / sitemap）。 */
export function absoluteUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE.url}${p}`;
}
