"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes } from "react";
import {
  trackEvent,
  type AnalyticsEventName,
  type AnalyticsEventParams,
} from "@/src/lib/analytics";

type TrackedLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    eventName: AnalyticsEventName;
    eventParams?: AnalyticsEventParams;
  };

type TrackedAnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  eventName: AnalyticsEventName;
  eventParams?: AnalyticsEventParams;
};

export function TrackedLink({
  eventName,
  eventParams,
  onClick,
  ...props
}: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        trackEvent(eventName, {
          page_path:
            typeof window === "undefined" ? undefined : window.location.pathname,
          ...eventParams,
        });
        onClick?.(event);
      }}
    />
  );
}

export function TrackedAnchor({
  eventName,
  eventParams,
  onClick,
  ...props
}: TrackedAnchorProps) {
  return (
    <a
      {...props}
      onClick={(event) => {
        trackEvent(eventName, {
          page_path:
            typeof window === "undefined" ? undefined : window.location.pathname,
          ...eventParams,
        });
        onClick?.(event);
      }}
    />
  );
}
