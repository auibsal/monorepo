"use client";

import type { Locale } from "@repo/internationalization";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import { useAuth } from "@/lib/auth/provider";
import { type events, localized, unwrap } from "@/lib/data";
import { Link, useRouter } from "@/lib/diwan/navigation";
import { useQueryParam } from "@/lib/diwan/use-query-param";
import { OnTheSite } from "../../site-links";
import { ErrorState, SectionSpinner } from "../../states";
import { RecordView } from "../kit";
import { NotionManaged } from "../notion-managed";
import { DeleteRecord } from "../recently-deleted";
import { RecordHistory } from "../record-history";
import { AccessForm } from "./access-form";
import { Attendance } from "./attendance";
import { EventFacts } from "./facts";
import { EventFeedbackAdmin } from "./feedback";
import { GuestInvitations } from "./guest-invitations";
import { Incidents } from "./incidents";
import { Invitations } from "./invitations";
import { EventPartsAdmin } from "./parts";
import { EventProgramAdmin } from "./program";
import { PromoKit } from "./promo/kit";

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
 * An event in the Diwan (decisions.md, Events): made and edited only
 * here, every field (EventFacts), with the site's own parts below: Good to
 * know, invitations, bookings and check-in, and the standard parts.
 * Notion's Events database keeps a read-only copy.
 */
export const EventEditor = () => {
  const t = useTranslations("diwan.admin.event");
  const tk = useTranslations("diwan.admin.kit");
  const router = useRouter();
  const locale = useLocale() as Locale;
  const eventId = useQueryParam("id");
  const { supabase } = useAuth();

  const existing = useQuery({
    enabled: Boolean(eventId),
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("api")
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

  return (
    <RecordView
      actions={<PublicPage slug={event.slug} status={event.status} />}
      back={
        <Link className="link" href="/events">
          {tk("back")}
        </Link>
      }
      history={<RecordHistory id={eventId} table="events.events" />}
      status={`${tk("status")}: ${tk(`statuses.${event.status as "draft"}`)}`}
      title={localized(event, "title", locale)}
    >
      <EventFacts event={event} key={`facts-${event.updated_at}`} />
      <NotionManaged kind="event" recordId={eventId} />

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
      <EventProgramAdmin eventId={eventId} />
      <EventFeedbackAdmin eventId={eventId} />
      <EventPartsAdmin event={event} />
      <PromoKit event={event} />
      <Incidents eventId={eventId} />
      {event.status === "draft" ? (
        <DeleteRecord
          id={eventId}
          kind="event"
          onDeleted={() => router.push("/events")}
        />
      ) : null}
    </RecordView>
  );
};
