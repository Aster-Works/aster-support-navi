"use client";

type AnalyticsParamValue = string | number | boolean | null | undefined;

export type AnalyticsEventName =
  | "diagnosis_start"
  | "diagnosis_complete"
  | "support_detail_view"
  | "official_link_click"
  | "pro_interest_click"
  // Phase 0（収益導線）: Pro 閲覧・Stripe（Payment Link）クリック・サンプルパック閲覧。
  | "pro_view"
  | "stripe_click"
  | "sample_pack_view"
  // 申請前パック（PDF/印刷）の補助計測。
  | "checklist_viewed"
  | "checklist_printed"
  | (string & {});

export type AnalyticsEventParams = Record<string, AnalyticsParamValue>;

const QUEUED_EVENTS_KEY = "aster.analytics.queue";

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
  // Phase 0（収益導線）: クリックされた料金プラン（free/personal/pro/team）と
  // サンプル相談パックの識別子。いずれも非PIIの短い列挙値のみ。
  "plan",
  "sample",
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

type QueuedAnalyticsEvent = {
  eventName: AnalyticsEventName;
  params: Record<string, string | number | boolean>;
  queuedAt: number;
};

function readQueuedEvents(): QueuedAnalyticsEvent[] {
  try {
    const raw = window.sessionStorage.getItem(QUEUED_EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (event): event is QueuedAnalyticsEvent =>
        event &&
        typeof event.eventName === "string" &&
        typeof event.params === "object" &&
        typeof event.queuedAt === "number",
    );
  } catch {
    return [];
  }
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

/** 内部リンク遷移でイベントが失われないよう、次ページで送るため一時キューする。 */
export function queueEvent(
  eventName: AnalyticsEventName,
  params: AnalyticsEventParams = {},
): void {
  if (typeof window === "undefined") return;
  try {
    const queue = readQueuedEvents().slice(-9);
    queue.push({
      eventName,
      params: sanitizeParams(params),
      queuedAt: Date.now(),
    });
    window.sessionStorage.setItem(QUEUED_EVENTS_KEY, JSON.stringify(queue));
  } catch {
    trackEvent(eventName, params);
  }
}

/** キュー済みイベントを送信する。gtag未初期化なら消さずに次回へ回す。 */
export function flushQueuedEvents(): void {
  if (
    typeof window === "undefined" ||
    typeof window.gtag !== "function" ||
    !window.__asterGaDestinationId
  ) {
    return;
  }

  const queue = readQueuedEvents();
  if (queue.length === 0) return;

  try {
    window.sessionStorage.removeItem(QUEUED_EVENTS_KEY);
  } catch {
    // storage 失敗時も送信は試みる。
  }

  const maxAgeMs = 5 * 60 * 1000;
  const now = Date.now();
  for (const event of queue) {
    if (now - event.queuedAt > maxAgeMs) continue;
    trackEvent(event.eventName, event.params);
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
