"use client";

import { Button } from "@repo/brand/components/ui/button";
import { apiPath, type Locale } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

interface WeekEvent {
  id: string;
  included: boolean | null;
  starts_at: string;
  title_ar: string;
  title_en: string;
}

type State =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "failed" }
  | { events: WeekEvent[]; kind: "ready" };

/**
 * Next week's events from Student Life's weekly email, each marked
 * included or not, by the token in the link (no account needed).
 */
export const StudentLifeWeek = () => {
  const t = useTranslations("web.studentLifeWeek");
  const locale = useLocale() as Locale;
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState<string | null>(null);

  const call = useCallback(
    async (answer?: { event_id: string; included: boolean }) => {
      try {
        const response = await fetch(apiPath("/student-life/week"), {
          body: JSON.stringify({ answer, token }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        if (response.status === 400) {
          setState({ kind: "invalid" });
          return;
        }
        if (!response.ok) {
          setState({ kind: "failed" });
          return;
        }
        const data = (await response.json()) as { events: WeekEvent[] };
        setState({ events: data.events, kind: "ready" });
      } catch {
        setState({ kind: "failed" });
      }
    },
    [token]
  );

  useEffect(() => {
    if (token) {
      call();
    } else {
      setState({ kind: "invalid" });
    }
  }, [call, token]);

  if (state.kind === "loading") {
    return null;
  }
  if (state.kind !== "ready") {
    return (
      <p className="type-lede" role="status">
        {t(state.kind)}
      </p>
    );
  }
  const mark = async (id: string, included: boolean) => {
    setBusy(id);
    await call({ event_id: id, included });
    setBusy(null);
  };
  return (
    <ul className="divide-line border-line grid divide-y border-y">
      {state.events.map((e) => (
        <li className="grid gap-3 py-4" key={e.id}>
          <div className="grid gap-1">
            <p className="type-title">
              {locale === "ar" ? e.title_ar : e.title_en}
            </p>
            <p className="type-caption">
              {formatLongDate(e.starts_at, locale)},{" "}
              {formatClock(e.starts_at, locale)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              aria-pressed={e.included === true}
              disabled={busy === e.id}
              onClick={() => mark(e.id, true)}
              size="sm"
              type="button"
              variant={e.included === true ? "default" : "outline"}
            >
              {t("included")}
            </Button>
            <Button
              aria-pressed={e.included === false}
              disabled={busy === e.id}
              onClick={() => mark(e.id, false)}
              size="sm"
              type="button"
              variant={e.included === false ? "default" : "outline"}
            >
              {t("notIncluded")}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
};
