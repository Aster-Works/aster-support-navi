"use client";

import Script from "next/script";
import { useEffect } from "react";
import { cn } from "@/app/lib/cn";
import { ADSENSE_CLIENT_ID, ADSENSE_ENABLED } from "@/app/lib/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdSenseUnitProps = {
  slot?: string;
  className?: string;
};

export function AdSenseUnit({ slot, className }: AdSenseUnitProps) {
  useEffect(() => {
    if (!ADSENSE_ENABLED || !slot) return;

    try {
      const ads = window.adsbygoogle ?? [];
      window.adsbygoogle = ads;
      ads.push({});
    } catch {
      // Ad blockers or delayed script loading should never break the page.
    }
  }, [slot]);

  if (!ADSENSE_ENABLED || !slot) return null;

  return (
    <aside
      className={cn(
        "my-8 border-y border-soft-gray/80 py-5",
        className,
      )}
      aria-label="広告"
    >
      <Script
        id="adsense-script"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
        strategy="afterInteractive"
        crossOrigin="anonymous"
      />
      <p className="mb-3 text-[11px] font-medium tracking-wide text-charcoal/45">
        広告
      </p>
      <ins
        className="adsbygoogle block min-h-[90px]"
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
