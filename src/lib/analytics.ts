"use client";

type AnalyticsParamValue = string | number | boolean | null | undefined;

export type AnalyticsEventName =
  | "diagnosis_start"
  | "diagnosis_complete"
  | "support_detail_view"
  | "official_link_click"
  | "pro_interest_click"
  | (string & {});

export type AnalyticsEventParams = Record<string, AnalyticsParamValue>;

const ALLOWED_PARAM_KEYS = new Set([
  "source",
  "page_path",
  "result_count",
  "prefecture",
  "city",
  "category_count",
  "support_id",
  "support_title",
  "category",
  "municipality",
  "outbound_url_domain",
  "plan_hint",
  // Legacy non-PII keys used by checklist/save diagnostics.
  "context",
  "count",
  "host",
]);

declare global {
  interface Window {
    __asterGaDestinationId?: string;
    gtag?: (
      command: "event" | "config" | "js",
      target: string | Date,
      params?: Record<string, unknown>,
    ) => void;
  }
}

function truncate(value: string, key: string): string {
  const max = key === "support_title" ? 120 : 80;
  return value.slice(0, max);
}

function sanitizeParams(params: AnalyticsEventParams): Record<string, string | number | boolean> {
  const safe: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!ALLOWED_PARAM_KEYS.has(key)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === "number") {
      if (Number.isFinite(value)) safe[key] = value;
      continue;
    }
    if (typeof value === "boolean") {
      safe[key] = value;
      continue;
    }
    safe[key] = truncate(value, key);
  }
  return safe;
}

/**
 * GA4 カスタムイベント送信。
 *
 * 個人情報・自由入力本文・詳細住所・電話番号・メールアドレスは送らない。
 * 許可した短いパラメータだけをGA4宛先へ送り、Google Adsタグだけの状態では送信しない。
 */
export function trackEvent(
  eventName: AnalyticsEventName,
  params: AnalyticsEventParams = {},
): void {
  if (
    typeof window === "undefined" ||
    typeof window.gtag !== "function" ||
    !window.__asterGaDestinationId
  ) {
    return;
  }

  try {
    window.gtag("event", eventName, {
      send_to: window.__asterGaDestinationId,
      transport_type: "beacon",
      ...sanitizeParams(params),
    });
  } catch {
    // 計測失敗はUXに影響させない。
  }
}

/** 外部URLからドメインだけを取り出す。パス・クエリ・フラグメントはGA4へ送らない。 */
export function safeHost(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}
