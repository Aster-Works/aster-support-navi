export { safeHost, trackEvent } from "@/src/lib/analytics";

/** 既存呼び出しの互換名。新規実装では trackEvent を使う。 */
export { trackEvent as track } from "@/src/lib/analytics";
