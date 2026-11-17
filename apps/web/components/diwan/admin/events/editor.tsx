"use client";

import type { Locale } from "@repo/internationalization";
import { dirOf } from "@repo/internationalization/config";
import {
  formatClock,
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth/provider";
import { events, localized, unwrap } from "@/lib/data";
import { Link, useRouter } from "@/lib/diwan/navigation";
import { useGrants } from "@/lib/diwan/queries";
import { useQueryParam } from "@/lib/diwan/use-query-param";
import { hasPermissionAnywhere } from "@/lib/rbac";
import { DiwanSection } from "../../page";
import { OnTheSite } from "../../site-links";
import { ErrorState, SectionSpinner } from "../../states";
import { RecordView } from "../kit";
import { useMemberNames } from "../member-picker";
import { memberName } from "../members/directory";
import { Needs } from "../needs";
import { NotionManaged } from "../notion-managed";
import { Shifts } from "../programs/admin";
import { DeleteRecord } from "../recently-deleted";
import { EditableSection, Fact, Facts } from "../record";
import { RecordHistory } from "../record-history";
import { AccessForm } from "./access-form";
import { Attendance } from "./attendance";
import { EventChecklist, RunOfShow } from "./checklist";
import { DebriefField, EventFacts, StatusActions } from "./facts";
import { EventFeedbackAdmin } from "./feedback";
import { GuestInvitations } from "./guest-invitations";
import { Incidents } from "./incidents";
import { Invitations } from "./invitations";
import { EventOrganizations, EventPartner } from "./joint";
import { EventOffCampus } from "./off-campus";
import { EventMinutes } from "./parts";
import { EventProgramAdmin } from "./program";
import { PromoKit } from "./promo/kit";
import { SessionLinks } from "./session-links";

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

/** "Tuesday, October 13, 6:00 p.m." for the event's start and end. */
const When = ({
  endsAt,
  locale,
  startsAt,
}: {
  readonly endsAt: string | null;
  readonly locale: Locale;
  readonly startsAt: string;
}) => (
  <>
    {formatLongDate(startsAt, locale)}, {formatClock(startsAt, locale)}
    {endsAt ? ` – ${formatClock(endsAt, locale)}` : null}
  </>
);

/** A value in the other language, isolated in its own direction (B5). */
const Other = ({
  lang,
  children,
}: {
  readonly children: ReactNode;
  readonly lang: "ar" | "en";
}) => (
  <span className="block" dir={dirOf(lang)} lang={lang}>
    {children}
  </span>
);

type EventRow = NonNullable<ReturnType<typeof useEvent>["data"]>;

const useEvent = (eventId: string | null) => {
  const { supabase } = useAuth();
  return useQuery({
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
};

/** Who can come and how, as the public page says it. */
const useWho = () => {
  const tw = useTranslations("web.events.goodToKnow.who");
  const locale = useLocale() as Locale;
  return (event: EventRow) =>
    event.entry === "invite"
      ? tw("invite")
      : `${events.classesLabel(event.classes, {
          everyone: tw("everyone"),
          locale: locale === "ar" ? "ar" : "en",
          names: {
            associate: tw("classes.associate"),
            guest: tw("classes.guest"),
            honorary: tw("classes.honorary"),
            member: tw("classes.member"),
          },
          only: (name) => tw("only", { classes: name }),
        })} · ${tw(event.entry === "open" ? "how.open" : "how.rsvp")}`;
};

/** Overview: what's next, where it is, the public page and the promo kit. */
const OverviewTab = ({ event }: { readonly event: EventRow }) => {
  const t = useTranslations("diwan.admin.event");
  const tk = useTranslations("diwan.admin.kit");
  const tf = useTranslations("diwan.admin.event.facts");
  const locale = useLocale() as Locale;
  const who = useWho();
  return (
    <>
      <EditableSection id="overview" title={t("tabs.overview")}>
        <Facts>
          <Fact label={tk("status")}>
            {tk(`statuses.${event.status as "draft"}`)}
          </Fact>
          <Fact label={t("starts")}>
            <When
              endsAt={event.ends_at}
              locale={locale}
              startsAt={event.starts_at}
            />
          </Fact>
          <Fact label={t("venue")}>
            {localized(event, "venue", locale) || tf("noVenue")}
          </Fact>
          <Fact label={t("tabs.access")}>{who(event)}</Fact>
          <Fact label={tf("slug")}>
            <bdi dir="ltr">{`/events/${event.slug}`}</bdi>
          </Fact>
        </Facts>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <PublicPage slug={event.slug} status={event.status} />
          <Link className="link" href={`/events/${event.slug}?tab=promotion`}>
            {t("openPromo")}
          </Link>
        </div>
      </EditableSection>
      <EventChecklist eventId={event.id} />
      <NotionManaged kind="event" recordId={event.id} />
    </>
  );
};

/** Details: the facts the page shows, read as text, with Edit. */
const DetailsTab = ({ event }: { readonly event: EventRow }) => {
  const t = useTranslations("diwan.admin.event");
  const tf = useTranslations("diwan.admin.event.facts");
  const locale = useLocale() as Locale;
  const other = locale === "ar" ? "en" : "ar";
  return (
    <>
      <EditableSection
        form={
          <EventFacts
            event={event}
            key={`details-${event.updated_at}`}
            part="details"
          />
        }
        id="details"
        title={t("tabs.details")}
      >
        <Facts>
          <Fact label={tf("title")}>
            {localized(event, "title", locale)}
            <Other lang={other}>{localized(event, "title", other)}</Other>
          </Fact>
          <Fact label={t("starts")}>
            <When
              endsAt={event.ends_at}
              locale={locale}
              startsAt={event.starts_at}
            />
          </Fact>
          <Fact label={t("venue")}>
            {localized(event, "venue", locale) || tf("noVenue")}
          </Fact>
          <Fact label={tf("summary")}>
            {localized(event, "summary", locale) || tf("notWritten")}
          </Fact>
          <Fact label={t("format")}>
            {t(`formats.${(event.format ?? "none") as "none"}`)}
          </Fact>
          <Fact label={tf("image")}>
            {event.image_path ? tf("hasImage") : tf("noImage")}
          </Fact>
        </Facts>
      </EditableSection>
      <EventOffCampus event={event} />
      <SessionLinks eventId={event.id} />
    </>
  );
};

/** Access: who can come, how, the capacity and Good to know. */
const AccessTab = ({ event }: { readonly event: EventRow }) => {
  const t = useTranslations("diwan.admin.event");
  const tf = useTranslations("diwan.admin.event.facts");
  const tg = useTranslations("web.events.goodToKnow");
  const who = useWho();
  const yesNo = (value: boolean | null) => {
    if (value === null) {
      return t("notSaid");
    }
    return value ? t("yes") : t("no");
  };
  return (
    <>
      <EditableSection
        form={
          <EventFacts
            event={event}
            key={`access-${event.updated_at}`}
            part="access"
          />
        }
        id="access"
        title={t("tabs.access")}
      >
        <Facts>
          <Fact label={tg("who.label")}>{who(event)}</Fact>
          <Fact label={t("capacity")}>
            {event.capacity ? formatNumber(event.capacity) : tf("noLimit")}
          </Fact>
        </Facts>
      </EditableSection>
      <EditableSection
        form={
          <AccessForm
            event={event}
            eventId={event.id}
            key={event.updated_at}
            rsvp={event.entry !== "open"}
          />
        }
        id="good-to-know"
        title={tg("title")}
      >
        <Facts>
          <Fact label={t("language")}>
            {event.language
              ? tg(`language.${event.language as "en"}`)
              : t("notSaid")}
          </Fact>
          <Fact label={t("stepFree")}>{yesNo(event.step_free)}</Fact>
          <Fact label={t("seating")}>
            {event.seating
              ? tg(`access.seating.${event.seating as "seated"}`)
              : t("notSaid")}
          </Fact>
          <Fact label={t("servesFood")}>{yesNo(event.serves_food)}</Fact>
          <Fact label={t("noPhotos")}>{yesNo(event.no_photos)}</Fact>
        </Facts>
      </EditableSection>
    </>
  );
};

/** People: the lead and host, the team's shifts, guests and partners. */
const PeopleTab = ({ event }: { readonly event: EventRow }) => {
  const t = useTranslations("diwan.admin.event");
  const tf = useTranslations("diwan.admin.event.facts");
  const tp = useTranslations("diwan.admin.event.parts");
  const locale = useLocale() as Locale;
  const names = useMemberNames([event.lead_id]);
  const lead = names.data?.find((p) => p.id === event.lead_id);
  return (
    <>
      <EditableSection
        form={
          <EventFacts
            event={event}
            key={`people-${event.updated_at}`}
            part="people"
          />
        }
        id="people"
        title={t("tabs.people")}
      >
        <Facts>
          <Fact label={tf("lead")}>
            {lead ? memberName(lead, locale) : tf("noLead")}
          </Fact>
        </Facts>
      </EditableSection>
      <EventPartner event={event} />
      <EventOrganizations eventId={event.id} />
      <DiwanSection id="shifts" title={tp("shifts")}>
        <Shifts eventId={event.id} />
      </DiwanSection>
      <DiwanSection id="needs" title={tp("needs")}>
        <Needs eventId={event.id} />
      </DiwanSection>
      {event.entry === "invite" ? <Invitations eventId={event.id} /> : null}
      {event.entry === "rsvp" ? <GuestInvitations eventId={event.id} /> : null}
      <Attendance
        capacity={event.capacity}
        eventId={event.id}
        questions={asQuestions(event.questions)}
        slug={event.slug}
      />
    </>
  );
};

/** After: check-ins, feedback, the debrief, minutes and incidents. */
const AfterTab = ({ event }: { readonly event: EventRow }) => {
  const t = useTranslations("diwan.admin.event");
  const grants = useGrants();
  // A meeting's minutes, for those who keep them.
  const keepsMinutes =
    hasPermissionAnywhere(grants.data, "governance.manage") ||
    hasPermissionAnywhere(grants.data, "governance.minutes.write");
  return (
    <>
      <EventFeedbackAdmin eventId={event.id} />
      <EditableSection id="debrief" title={t("debriefTitle")}>
        <DebriefField eventId={event.id} />
      </EditableSection>
      {keepsMinutes ? <EventMinutes eventId={event.id} /> : null}
      <Incidents eventId={event.id} />
    </>
  );
};

/**
 * An event in the Diwan (decisions.md, Events: made and edited only here;
 * The site: "One record page"): its header with the one main action
 * (Publish, or Cancel once published) and a menu for the rest, then its
 * tabs: Overview, Details, Access, People, Program, Promotion, After and
 * History. Notion's Events database keeps a read-only copy.
 */
export const EventEditor = () => {
  const t = useTranslations("diwan.admin.event");
  const tk = useTranslations("diwan.admin.kit");
  const router = useRouter();
  const locale = useLocale() as Locale;
  const client = useQueryClient();
  const eventId = useQueryParam("id");
  const existing = useEvent(eventId);

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
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["admin", "event", eventId] });

  return (
    <RecordView
      actions={<StatusActions event={event} onDone={refresh} />}
      back={
        <Link className="link" href="/events">
          {tk("back")}
        </Link>
      }
      history={<RecordHistory id={eventId} table="events.events" />}
      menu={
        <>
          <PublicPage slug={event.slug} status={event.status} />
          <Link className="link" href={`/events/${event.slug}/check-in`}>
            {t("checkIn")}
          </Link>
          {event.status === "draft" ? (
            <DeleteRecord
              id={eventId}
              kind="event"
              onDeleted={() => router.push("/events")}
            />
          ) : null}
        </>
      }
      status={`${tk("status")}: ${tk(`statuses.${event.status as "draft"}`)}`}
      tabs={[
        {
          content: <DetailsTab event={event} />,
          id: "details",
          label: t("tabs.details"),
        },
        {
          content: <AccessTab event={event} />,
          id: "access",
          label: t("tabs.access"),
        },
        {
          content: <PeopleTab event={event} />,
          id: "people",
          label: t("tabs.people"),
        },
        {
          content: (
            <>
              <RunOfShow eventId={eventId} value={event.run_of_show} />
              <EventProgramAdmin eventId={eventId} />
            </>
          ),
          id: "program",
          label: t("tabs.program"),
        },
        {
          content: <PromoKit event={event} />,
          id: "promotion",
          label: t("tabs.promotion"),
        },
        {
          content: <AfterTab event={event} />,
          id: "after",
          label: t("tabs.after"),
        },
      ]}
      title={localized(event, "title", locale)}
    >
      <OverviewTab event={event} />
    </RecordView>
  );
};
