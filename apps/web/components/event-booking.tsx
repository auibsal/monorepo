"use client";

import { Button } from "@repo/brand/components/ui/button";
import {
  apiPath,
  type Locale,
  localizedPath,
} from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { hasSessionCookie } from "@/lib/auth/session-cookie";
import type { BookingTerms } from "@/lib/data/events";

type Status = "booked" | "held" | "waiting" | "reminded" | "none";

// The Supabase client and the booking calls load only for someone signed
// in, so the page stays within its budget for everyone else (it is cached
// and the same for all; apps/e2e/tests/performance.spec.ts).
const loadClient = async () =>
  (await import("@/lib/diwan/supabase")).getSupabase();
const loadEvents = async () => await import("@/lib/data/events");
type Notice = "booked" | "waitlisted" | "canceled" | "reminded" | "failed";

/**
 * Booking on the event's own page (audit C8): a signed-in member books,
 * joins the waitlist or cancels right here, and an open event's "Remind
 * me" works the same way; booking asks nothing. Someone signed out goes to
 * sign in. The page stays the same for everyone (cached); this reads the person's own
 * booking after the first render, and the database decides (events.rsvp).
 */
export const EventBooking = ({
  entry,
  eventId,
  forClasses,
  guestsBy,
  slug,
}: {
  /** How (decisions.md, Events: Access): open, rsvp or invite. */
  readonly entry: string;
  readonly eventId: string;
  /** "This event is for Members.", for anyone whose class isn't ticked. */
  readonly forClasses: string;
  /** On campus, the day Guests' booking closes. */
  readonly guestsBy: string | null;
  readonly slug: string;
}) => {
  const t = useTranslations("web.events");
  const locale = useLocale() as Locale;
  const calendar = `${localizedPath(locale, "/account/events")}#${slug}`;
  // The event's own .ics, so the person's calendar reminds them too.
  const ics = apiPath(`/calendar/events/${slug}.ics?lang=${locale}`);
  const [signedIn, setSignedIn] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [terms, setTerms] = useState<BookingTerms | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  // A released place held for them (decisions.md, Events): until when.
  const [heldUntil, setHeldUntil] = useState<string | null>(null);

  const load = useCallback(async () => {
    const client = await loadClient();
    const supabase = client.schema("api");
    const [rsvp, waiting, reminder, standing] = await Promise.all([
      supabase
        .from("rsvps")
        .select("id")
        .eq("event_id", eventId)
        .eq("status", "confirmed")
        .maybeSingle(),
      supabase
        .from("waitlist")
        .select("status, offered_until")
        .eq("event_id", eventId)
        .in("status", ["waiting", "offered"])
        .maybeSingle(),
      supabase
        .from("reminders")
        .select("event_id")
        .eq("event_id", eventId)
        .maybeSingle(),
      (await loadEvents()).bookingTerms(client, eventId),
    ]);
    setTerms(standing);
    const held =
      waiting.data?.status === "offered" ? waiting.data.offered_until : null;
    setHeldUntil(held);
    if (rsvp.data) {
      setStatus("booked");
    } else if (held) {
      setStatus("held");
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

  const book = () =>
    run(async () => {
      const [client, events] = await Promise.all([loadClient(), loadEvents()]);
      return (await events.rsvp(client, eventId)) === "waitlisted"
        ? "waitlisted"
        : "booked";
    });
  const cancel = () =>
    run(async () => {
      const [client, events] = await Promise.all([loadClient(), loadEvents()]);
      await events.cancelRsvp(client, eventId);
      return "canceled";
    });
  const remind = (on: boolean) =>
    run(async () => {
      const [client, events] = await Promise.all([loadClient(), loadEvents()]);
      await (on
        ? events.remindMe(client, eventId)
        : events.forgetReminder(client, eventId));
      return on ? "reminded" : "canceled";
    });

  // An Open event takes no booking, except from a Guest on campus.
  const open = terms ? !terms.books : entry === "open";

  // Signed out: the one line under the button (decisions.md, Events).
  if (!signedIn) {
    return (
      <>
        <Button asChild>
          <a href={calendar}>{entry === "open" ? t("remind") : t("rsvp")}</a>
        </Button>
        <span className="type-caption">{t("rsvpHint")}</span>
        <a className="link type-body" href={ics}>
          {t("addToCalendar")}
        </a>
      </>
    );
  }
  // Their class isn't ticked: whom it is for, in place of the button.
  if (terms && !terms.eligible) {
    return <p className="type-body">{forClasses}</p>;
  }
  // A Guest after the 14 days before an event on campus.
  if (terms?.guests_closed && guestsBy && status === "none") {
    return <p className="type-body">{t("guestsClosed")}</p>;
  }
  // Still loading: the calendar's link until the booking is known.
  if (status === null) {
    return (
      <Button asChild>
        <a href={calendar}>{open ? t("remind") : t("rsvp")}</a>
      </Button>
    );
  }

  return (
    <>
      <BookingAction
        busy={busy}
        onBook={book}
        onCancel={cancel}
        onRemind={remind}
        open={open}
        status={status}
      />
      <span aria-live="polite" className="type-caption">
        {notice ? t(`notices.${notice}`) : null}
        {notice ? null : <StatusLine heldUntil={heldUntil} status={status} />}
      </span>
      {/* Right after booking, and while booked: the confirmation's link. */}
      {status === "booked" || status === "reminded" ? (
        <a className="link type-body" href={ics}>
          {t("addToCalendar")}
        </a>
      ) : null}
    </>
  );
};

/** The one action for where the person stands. */
const BookingAction = ({
  busy,
  onBook,
  onCancel,
  onRemind,
  open,
  status,
}: {
  readonly busy: boolean;
  readonly onBook: () => void;
  readonly onCancel: () => void;
  readonly onRemind: (on: boolean) => void;
  readonly open: boolean;
  readonly status: Status;
}) => {
  const t = useTranslations("web.events");
  if (open) {
    return status === "reminded" ? (
      <Button disabled={busy} onClick={() => onRemind(false)} variant="outline">
        {t("forget")}
      </Button>
    ) : (
      <Button disabled={busy} onClick={() => onRemind(true)}>
        {t("remind")}
      </Button>
    );
  }
  if (status === "held") {
    return (
      <>
        <Button disabled={busy} onClick={onBook}>
          {t("claim")}
        </Button>
        <Button disabled={busy} onClick={onCancel} variant="outline">
          {t("decline")}
        </Button>
      </>
    );
  }
  if (status === "booked" || status === "waiting") {
    return (
      <Button disabled={busy} onClick={onCancel} variant="outline">
        {status === "booked" ? t("cancelBooking") : t("leaveWaitlist")}
      </Button>
    );
  }
  return (
    <Button disabled={busy} onClick={onBook}>
      {t("rsvp")}
    </Button>
  );
};

/** Where the person stands, in a line: booked, waiting or a place held. */
const StatusLine = ({
  heldUntil,
  status,
}: {
  readonly heldUntil: string | null;
  readonly status: Status;
}) => {
  const t = useTranslations("web.events");
  const locale = useLocale() as Locale;
  if (status === "booked") {
    return t("youreBooked");
  }
  if (status === "waiting") {
    return t("youreWaiting");
  }
  if (status === "held" && heldUntil) {
    return t("held", {
      until: `${formatLongDate(heldUntil, locale)}, ${formatClock(heldUntil, locale)}`,
    });
  }
  return null;
};
