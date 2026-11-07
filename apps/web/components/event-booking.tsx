"use client";

import { hasSessionCookie } from "@repo/auth/session-cookie";
import { Button } from "@repo/brand/components/ui/button";
import { type Locale, localizedPath } from "@repo/internationalization";
import { events } from "@repo/sal-data";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/diwan/supabase";

type Status = "booked" | "waiting" | "reminded" | "none";
type Notice = "booked" | "waitlisted" | "cancelled" | "reminded" | "failed";

/**
 * Booking on the event's own page (audit C8): a signed-in member books,
 * joins the waitlist or cancels right here, and an open event's "Remind
 * me" works the same way. Someone signed out, or an event with booking
 * questions, goes to their calendar, where the questions are asked. The
 * page stays the same for everyone (cached); this reads the person's own
 * booking after the first render, and the database decides (events.rsvp).
 */
export const EventBooking = ({
  eventId,
  open,
  slug,
}: {
  readonly eventId: string;
  /** An open event: no booking, only "Remind me". */
  readonly open: boolean;
  readonly slug: string;
}) => {
  const t = useTranslations("web.events");
  const locale = useLocale() as Locale;
  const calendar = `${localizedPath(locale, "/account/calendar")}#${slug}`;
  const [signedIn, setSignedIn] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [asks, setAsks] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabase().schema("events");
    const [rsvp, waiting, reminder, event] = await Promise.all([
      supabase
        .from("rsvps")
        .select("id")
        .eq("event_id", eventId)
        .eq("status", "confirmed")
        .maybeSingle(),
      supabase
        .from("waitlist")
        .select("id")
        .eq("event_id", eventId)
        .eq("status", "waiting")
        .maybeSingle(),
      supabase
        .from("reminders")
        .select("event_id")
        .eq("event_id", eventId)
        .maybeSingle(),
      supabase
        .from("events")
        .select("questions")
        .eq("id", eventId)
        .maybeSingle(),
    ]);
    setAsks(
      Array.isArray(event.data?.questions) && event.data.questions.length > 0
    );
    if (rsvp.data) {
      setStatus("booked");
    } else if (waiting.data) {
      setStatus("waiting");
    } else if (reminder.data) {
      setStatus("reminded");
    } else {
      setStatus("none");
    }
  }, [eventId]);

  useEffect(() => {
    if (hasSessionCookie(document.cookie)) {
      setSignedIn(true);
      load().catch(() => setStatus("none"));
    }
  }, [load]);

  const run = async (task: () => Promise<Notice>) => {
    setBusy(true);
    setNotice(null);
    try {
      setNotice(await task());
      await load();
    } catch {
      setNotice("failed");
    } finally {
      setBusy(false);
    }
  };

  const client = () => getSupabase();
  const book = () =>
    run(async () =>
      (await events.rsvp(client(), eventId)) === "waitlisted"
        ? "waitlisted"
        : "booked"
    );
  const cancel = () =>
    run(async () => {
      await events.cancelRsvp(client(), eventId);
      return "cancelled";
    });
  const remind = (on: boolean) =>
    run(async () => {
      await (on
        ? events.remindMe(client(), eventId)
        : events.forgetReminder(client(), eventId));
      return on ? "reminded" : "cancelled";
    });

  // Signed out, still loading, or questions to answer: the calendar asks.
  if (!signedIn || status === null || (asks && !open && status === "none")) {
    return (
      <Button asChild>
        <a href={calendar}>{open ? t("remind") : t("rsvp")}</a>
      </Button>
    );
  }

  let action: React.ReactNode;
  if (open) {
    action =
      status === "reminded" ? (
        <Button disabled={busy} onClick={() => remind(false)} variant="outline">
          {t("forget")}
        </Button>
      ) : (
        <Button disabled={busy} onClick={() => remind(true)}>
          {t("remind")}
        </Button>
      );
  } else if (status === "booked" || status === "waiting") {
    action = (
      <Button disabled={busy} onClick={cancel} variant="outline">
        {status === "booked" ? t("cancelBooking") : t("leaveWaitlist")}
      </Button>
    );
  } else {
    action = (
      <Button disabled={busy} onClick={book}>
        {t("rsvp")}
      </Button>
    );
  }

  return (
    <>
      {action}
      <span aria-live="polite" className="type-caption">
        {notice ? t(`notices.${notice}`) : null}
        {!notice && status === "booked" ? t("youreBooked") : null}
        {!notice && status === "waiting" ? t("youreWaiting") : null}
      </span>
    </>
  );
};
