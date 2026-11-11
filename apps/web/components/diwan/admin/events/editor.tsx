"use client";

import type { Locale } from "@repo/internationalization";
import {
  formatClock,
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import { useAuth } from "@/lib/auth/provider";
import { type events, localized, unwrap } from "@/lib/data";
import { Link } from "@/lib/diwan/navigation";
import { useQueryParam } from "@/lib/diwan/use-query-param";
import { OnTheSite } from "../../site-links";
import { ErrorState, SectionSpinner } from "../../states";
import { AdminHeading } from "../kit";
import { NotionManaged } from "../notion-managed";
import { RecordHistory } from "../record-history";
import { AccessForm } from "./access-form";
import { Attendance } from "./attendance";
import { GuestInvitations } from "./guest-invitations";
import { Invitations } from "./invitations";
import { EventPartsAdmin } from "./parts";

interface Question {
  id: string;
  label_ar: string;
  label_en: string;
  required: boolean;
}

/** Registration questions from the jsonb column (always an array there). */
const asQuestions = (value: unknown): Question[] =>
  Array.isArray(value) ? (value as Question[]) : [];

/** A published event's public page, from its page in the Diwan. */
const PublicPage = ({
  slug,
  status,
}: {
  readonly slug?: string | null;
  readonly status: string;
}) =>
  slug && status === "published" ? (
    <OnTheSite href={`/events/${slug}`} />
  ) : null;

/**
 * An event in the Diwan (decisions §8): what Notion holds (the date, the
 * place, the access and the text) is shown, not edited; the site's own
 * parts are kept here: whether food is served (the booking's questions),
 * invitations, bookings and
 * check-in, and the standard parts.
 */
/** The event's debrief (F-13) in Notion, for its staff (decisions §13). */
const DebriefLink = ({ eventId }: { eventId: string }) => {
  const t = useTranslations("diwan.admin.event");
  const { supabase } = useAuth();
  const debrief = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .from("debriefs")
          .select("url")
          .eq("event_id", eventId)
          .maybeSingle()
      ),
    queryKey: ["admin", "event-debrief", eventId],
  });
  return debrief.data?.url ? (
    <a
      className="link justify-self-start"
      href={debrief.data.url}
      rel="noopener noreferrer"
      target="_blank"
    >
      {t("debrief")}
    </a>
  ) : null;
};

export const EventEditor = () => {
  const t = useTranslations("diwan.admin.event");
  const tk = useTranslations("diwan.admin.kit");
  const locale = useLocale() as Locale;
  const eventId = useQueryParam("id");
  const { supabase } = useAuth();

  const existing = useQuery({
    enabled: Boolean(eventId),
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .from("events")
          .select("*")
          .eq("id", eventId ?? "")
          .maybeSingle()
      ),
    queryKey: ["admin", "event", eventId],
  });

  if (existing.isPending) {
    return <SectionSpinner />;
  }
  if (existing.isError) {
    return <ErrorState onRetry={() => existing.refetch()} />;
  }
  const event = existing.data;
  if (!(eventId && event)) {
    return <p className="type-body text-text-secondary">{t("notFound")}</p>;
  }

  const entry = event.entry as events.Entry;
  const when = [
    `${formatLongDate(event.starts_at, locale, true)}, ${formatClock(event.starts_at, locale)}`,
    event.ends_at ? formatClock(event.ends_at, locale) : null,
  ]
    .filter(Boolean)
    .join("–");
  const facts: [string, string][] = [
    [t("when"), when],
    [t("venue"), localized(event, "venue", locale) || t("noVenue")],
    [t("entry"), `${t(`entries.${entry}`)}. ${t(`entryHint.${entry}`)}`],
    [t("seats"), event.capacity ? formatNumber(event.capacity) : t("noLimit")],
  ];

  return (
    <div className="grid gap-10">
      <AdminHeading
        actions={
          <>
            <Link
              className="text-sm underline underline-offset-4"
              href="/events"
            >
              {tk("back")}
            </Link>
            <PublicPage slug={event.slug} status={event.status} />
          </>
        }
        title={localized(event, "title", locale)}
      >
        {`${tk("status")}: ${tk(`statuses.${event.status as "draft"}`)}`}
      </AdminHeading>
      <NotionManaged kind="event" recordId={eventId} />
      <DebriefLink eventId={eventId} />
      <dl className="grid max-w-4xl gap-x-6 gap-y-3 sm:grid-cols-[10rem_1fr]">
        {facts.map(([term, value]) => (
          <div className="contents" key={term}>
            <dt className="type-label">{term}</dt>
            <dd className="type-body">{value}</dd>
          </div>
        ))}
      </dl>

      <AccessForm
        event={event}
        eventId={eventId}
        key={event.updated_at}
        rsvp={entry !== "open"}
      />

      {entry === "invite" ? <Invitations eventId={eventId} /> : null}
      {entry === "rsvp" ? <GuestInvitations eventId={eventId} /> : null}
      <Attendance
        capacity={event.capacity}
        eventId={eventId}
        questions={asQuestions(event.questions)}
        slug={event.slug}
      />
      <EventPartsAdmin event={event} />
      <RecordHistory id={eventId} table="events.events" />
    </div>
  );
};
