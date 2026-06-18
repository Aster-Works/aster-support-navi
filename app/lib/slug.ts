/** URL スラッグのユーティリティ（純関数・Vitest 対象）。 */

/** 英数とハイフンのみの slug へ正規化する。 */
export function slugify(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** slug として妥当か（英小文字・数字・ハイフン、先頭末尾ハイフン不可）。 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/** 制度 slug を「自治体-制度名」から組み立てる（admin 入力補助用）。 */
export function buildSupportSlug(
  prefectureSlug: string,
  citySlug: string,
  programKey: string,
): string {
  return [prefectureSlug, citySlug, programKey]
    .map(slugify)
    .filter(Boolean)
    .join("-");
}
