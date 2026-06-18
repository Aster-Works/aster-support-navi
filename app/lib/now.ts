/** サーバ実行時の「今日」（JST, YYYY-MM-DD）。
 *  期限バッジ等の表示にのみ使用。純関数テストには todayIso を引数で渡すこと。 */
export function getTodayIso(): string {
  const now = new Date();
  // UTC に +9h して JST のカレンダー日付を得る。
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}
