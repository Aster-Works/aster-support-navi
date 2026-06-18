"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Google Analytics 4（任意・env ゲート）。
 *
 * YMYL 上の最優先不変条件：**診断入力・検索語などの機微情報を解析へ送らない**。
 * - `NEXT_PUBLIC_GA_ID` 未設定なら一切ロードしない（完全オフがデフォルト）。
 * - `send_page_view: false` にして自動ページビューを止め、ルート変更ごとに
 *   **クエリ文字列を除いた path のみ**を手動送信する。
 *   `/check/result?...` や `/search?...` のクエリには診断回答・検索キーワードが
 *   乗りうるため、これを Google へ送信しないための措置。
 *
 * 注: GA4 プロパティ側の「拡張計測（Enhanced Measurement）」はスクロール等の自動
 * イベントで現在URL（クエリ込み）を拾いうるため、本番で有効化する際はプロパティ設定で
 * 拡張計測をオフにすること（運用メモ参照）。
 */

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function Analytics() {
  const pathname = usePathname();
  const firstLoad = useRef(true);

  useEffect(() => {
    if (!GA_ID) return;
    // 初回ロードのページビューは ga-init 内で path のみ送信済み。二重計上を避けるため初回はスキップ。
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    if (!window.gtag) return;
    window.gtag("event", "page_view", {
      page_path: pathname,
      // クエリ文字列は付けない（origin + pathname のみ）。
      page_location: window.location.origin + pathname,
      page_title: document.title,
    });
  }, [pathname]);

  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${GA_ID}', { send_page_view: false });
gtag('event', 'page_view', {
  page_path: location.pathname,
  page_location: location.origin + location.pathname,
  page_title: document.title
});
`}
      </Script>
    </>
  );
}
