"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { GA_ID, GOOGLE_ADS_ID, GOOGLE_TAG_LOADER_ID } from "@/app/lib/googleTag";

/**
 * Google tag（Google Ads は常時、GA4 は任意・env ゲート）。
 *
 * YMYL 上の最優先不変条件：**診断入力・検索語などの機微情報を解析へ送らない**。
 * - Google Ads のベースタグは `AW-18260421733` を読み込む。
 * - GA4 は `NEXT_PUBLIC_GA_ID` 未設定なら無効のまま。
 * - GA4 は `send_page_view: false` にして自動ページビューを止め、ルート変更ごとに
 *   **クエリ文字列を除いた path のみ**を手動送信する。
 *   `/check/result?...` や `/search?...` のクエリには診断回答・検索キーワードが
 *   乗りうるため、これを Google へ送信しないための措置。
 * - Google Ads の config でも page_location は origin + pathname に限定する。
 *
 * 注: GA4 プロパティ側の「拡張計測（Enhanced Measurement）」はスクロール等の自動
 * イベントで現在URL（クエリ込み）を拾いうるため、本番で有効化する際はプロパティ設定で
 * 拡張計測をオフにすること（運用メモ参照）。
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __asterGaDestinationId?: string;
  }
}

export function Analytics() {
  const pathname = usePathname();
  const firstLoad = useRef(true);

  useEffect(() => {
    // 初回ロードの config/page_view は google-tag-init 内で path のみ送信済み。
    // 二重計上を避けるため初回はスキップ。
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    if (!window.gtag) return;
    const page = {
      page_path: pathname,
      // クエリ文字列は付けない（origin + pathname のみ）。
      page_location: window.location.origin + pathname,
      page_title: document.title,
    };
    window.gtag("config", GOOGLE_ADS_ID, page);
    if (GA_ID) {
      window.__asterGaDestinationId = GA_ID;
      window.gtag("event", "page_view", {
        send_to: GA_ID,
        ...page,
      });
    }
  }, [pathname]);

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_LOADER_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-tag-init" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_ID}', {
  page_path: location.pathname,
  page_location: location.origin + location.pathname,
  page_title: document.title
});
${GA_ID ? `window.__asterGaDestinationId = '${GA_ID}';
gtag('config', '${GA_ID}', { send_page_view: false });
gtag('event', 'page_view', {
  send_to: '${GA_ID}',
  page_path: location.pathname,
  page_location: location.origin + location.pathname,
  page_title: document.title
});` : ""}
`}
      </Script>
    </>
  );
}
