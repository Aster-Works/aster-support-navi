/**
 * 入力サニタイズユーティリティ（セキュリティ）。
 *
 * - escapeLike: SQL LIKE / ILIKE のワイルドカード文字をエスケープし、
 *   ユーザー入力をリテラル文字列として安全に検索に使えるようにする。
 * - isAllowedRevalidatePath: ISR revalidate に渡せるパスかを検証する。
 */

/**
 * SQL LIKE/ILIKE クエリに使うユーザー入力から、ワイルドカード文字
 * `%` `_` `\` をバックスラッシュでエスケープする。
 *
 * Supabase の `.ilike()` / `.like()` は PostgreSQL の LIKE を使うため、
 * エスケープなしだと `%` が任意文字列、`_` が任意1文字として解釈され、
 * 意図しない全行マッチ等のデータ露出につながる。
 *
 * @example
 * ```ts
 * query.ilike("title", `%${escapeLike(userInput)}%`);
 * ```
 */
export function escapeLike(s: string): string {
  return s.replace(/[%_\\]/g, "\\$&");
}

/**
 * ISR on-demand revalidate に渡すパスとして安全か検証する。
 *
 * 許可条件:
 * - `/` で始まる
 * - 英小文字・数字・ハイフン・スラッシュのみ（日本語パスは不使用）
 * - パストラバーサル `..` を含まない
 * - 200文字以下
 */
const SAFE_PATH_RE = /^\/[a-z0-9\-/]*$/;

export function isAllowedRevalidatePath(p: string): boolean {
  return (
    p.length <= 200 &&
    SAFE_PATH_RE.test(p) &&
    !p.includes("..")
  );
}
