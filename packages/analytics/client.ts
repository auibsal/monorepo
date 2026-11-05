"use client";

import type { AnalyticsEvent, AnalyticsEvents } from "./events";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Records an event with GA4 when it is loaded (public site, GA ID set).
 * A no-op everywhere else, including the Diwan.
 */
export const track = <E extends AnalyticsEvent>(
  event: E,
  params: AnalyticsEvents[E]
) => {
  if (typeof window !== "undefined") {
    window.gtag?.("event", event, params);
  }
};
