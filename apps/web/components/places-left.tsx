"use client";

import { formatNumber } from "@repo/internationalization/format";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/** "Places left" shows only once fewer than this remain. */
const FEW = 20;

/**
 * Places left (decisions.md, Events: "Good to know"), read live after the
 * page loads so the cached page never shows an old count. A plain request
 * to the public count keeps the page within its budget.
 */
export const PlacesLeft = ({
  capacity,
  countUrl,
  eventId,
  publishableKey,
}: {
  readonly capacity: number;
  readonly countUrl: string;
  readonly eventId: string;
  readonly publishableKey: string;
}) => {
  const t = useTranslations("web.events.goodToKnow");
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(countUrl, {
      body: JSON.stringify({ event_id: eventId }),
      headers: {
        apikey: publishableKey,
        "Content-Profile": "events",
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((taken: unknown) => {
        if (typeof taken === "number") {
          setLeft(Math.max(capacity - taken, 0));
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [capacity, countUrl, eventId, publishableKey]);
  if (left === null || left >= FEW) {
    return null;
  }
  return (
    <span className="block">
      {t("placesLeft", { count: formatNumber(left) })}
    </span>
  );
};
