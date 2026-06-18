/** 日付・期限のユーティリティ（純関数・Vitest 対象）。
 *  入力は ISO の YYYY-MM-DD を想定（タイムゾーン非依存で扱う）。 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** YYYY-MM-DD を「2026年6月1日」へ整形。不正値は空文字。 */
export function formatJaDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = ISO_DATE.exec(iso.slice(0, 10));
  if (!m) return "";
  const [, y, mo, d] = m;
  return `${Number(y)}年${Number(mo)}月${Number(d)}日`;
}

/** 「最終確認日: 2026年6月1日」表示用。 */
export function formatCheckedAt(iso: string | null | undefined): string {
  const d = formatJaDate(iso);
  return d ? `${d}時点` : "確認日未設定";
}

/** today（YYYY-MM-DD）からの残日数。負なら過去。 */
export function daysUntil(
  endIso: string | null | undefined,
  todayIso: string,
): number | null {
  if (!endIso) return null;
  const end = ISO_DATE.exec(endIso.slice(0, 10));
  const today = ISO_DATE.exec(todayIso.slice(0, 10));
  if (!end || !today) return null;
  const endUTC = Date.UTC(Number(end[1]), Number(end[2]) - 1, Number(end[3]));
  const todayUTC = Date.UTC(
    Number(today[1]),
    Number(today[2]) - 1,
    Number(today[3]),
  );
  return Math.round((endUTC - todayUTC) / 86_400_000);
}

export type DeadlineStatus = "none" | "open" | "soon" | "closed";

/** 申請期限の状態。soonThreshold 日以内を soon とする。 */
export function deadlineStatus(
  endIso: string | null | undefined,
  todayIso: string,
  soonThreshold = 30,
): DeadlineStatus {
  if (!endIso) return "none";
  const days = daysUntil(endIso, todayIso);
  if (days === null) return "none";
  if (days < 0) return "closed";
  if (days <= soonThreshold) return "soon";
  return "open";
}

/** ISO 文字列が妥当な日付か。 */
export function isValidIsoDate(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const m = ISO_DATE.exec(iso.slice(0, 10));
  if (!m) return false;
  const [, y, mo, d] = m.map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  // 存在しない日付（例: 2026-02-31）を round-trip で弾く。
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === mo - 1 &&
    dt.getUTCDate() === d
  );
}
