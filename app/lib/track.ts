/**
 * GA4 カスタムイベント送信（YMYL 安全）。
 *
 * 不変条件: 診断回答・検索語・自由記述などの機微情報を解析へ送らない。
 * - 送れるのは許可キー（context/host/count/category）の短い値のみ。それ以外は捨てる。
 * - free-text・クエリ文字列・氏名・住所・症状などは一切送らない。
 * - GA 未設定（window.gtag 不在）なら何もしない。
 *
 * 使い方: track("diagnosis_completed", { count: 5 })
 */
const ALLOWED_KEYS = new Set(["context", "host", "count", "category"]);

export function track(
  event: string,
  params: Record<string, string | number> = {},
): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  const safe: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) {
    if (!ALLOWED_KEYS.has(k)) continue;
    if (typeof v === "number") safe[k] = v;
    else if (typeof v === "string") safe[k] = v.slice(0, 40); // 念のため短く切る
  }
  try {
    window.gtag("event", event, safe);
  } catch {
    /* 計測失敗は無視 */
  }
}

/** URL から host だけを安全に取り出す（official_link_clicked 等の非機微パラメータ用）。 */
export function safeHost(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}
