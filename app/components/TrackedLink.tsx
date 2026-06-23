"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, MouseEvent } from "react";
import {
  queueEvent,
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

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey
  );
}

function shouldQueueInternalNavigation(
  href: LinkProps["href"],
  target: AnchorHTMLAttributes<HTMLAnchorElement>["target"],
  event: MouseEvent<HTMLAnchorElement>,
): boolean {
  if (target || isModifiedClick(event)) return false;
  if (typeof href !== "string") return true;
  return href.startsWith("/") && !href.startsWith("//");
}

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
        onClick?.(event);
        if (event.defaultPrevented) return;

        const params = {
          page_path:
            typeof window === "undefined" ? undefined : window.location.pathname,
          ...eventParams,
        };

        if (shouldQueueInternalNavigation(props.href, props.target, event)) {
          queueEvent(eventName, params);
          return;
        }

        trackEvent(eventName, params);
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
