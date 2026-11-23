import {
  CoSponsoredBy,
  ThanksTo,
} from "@repo/brand/components/sal/acknowledgment";
import { ActionBar } from "@repo/brand/components/sal/action-bar";
import { Icon } from "@repo/brand/components/sal/icon";
import type { Locale } from "@repo/internationalization";
import { getDirection } from "@repo/internationalization";
import {
  formatClock,
  formatClockRange,
  formatLongDate,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EventBooking } from "@/components/event-booking";
import { classesText } from "@/components/event-classes";
import { EventFeedback } from "@/components/event-feedback";
import { EventParts } from "@/components/event-parts";
import { EventProgram } from "@/components/event-program";
import { GoodToKnow } from "@/components/good-to-know";
import { ManageLinks } from "@/components/manage-links";
import { events, localized, sanitizeRichText } from "@/lib/data";
import { acknowledged } from "@/lib/institutions";
import { eventLd, JsonLd } from "@/lib/json-ld";
import { mediaUrl } from "@/lib/media";
import { localizedMetadata } from "@/lib/metadata";
import { PLACEHOLDER_SLUG } from "@/lib/placeholder";
import { readPublished } from "@/lib/supabase";
import { roughlyNow } from "@/lib/this-year";

// Made on its first visit (its address names a record), then kept until
// it is published again.
export const instant = false;
// The placeholder (never a real address) gives the route a shell, so a
// missing record answers 404 before anything streams.
export const generateStaticParams = () => [{ slug: PLACEHOLDER_SLUG }];

interface EventProps {
  readonly params: Promise<{ locale: Locale; slug: string }>;
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/u;

// /events/<slug> is an event (a month of Events is /events?month=;
// old month addresses redirect, next.config.ts). The Supabase reads stay
// cached by tag until an event is published.

type PublicEvent = Awaited<ReturnType<typeof events.publicEvent>>;

const load = (slug: string): Promise<PublicEvent | null> =>
  SLUG.test(slug)
    ? readPublished(["events"], (c) => events.publicEvent(c, slug), null)
    : Promise.resolve(null);

export const generateMetadata = async ({
  params,
}: EventProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  const event = await load(slug);
  if (!event) {
    return {};
  }
  return localizedMetadata(locale, `/events/${event.slug}`, {
    description: localized(event, "summary", locale),
    image: mediaUrl(event.image_path) ?? undefined,
    imageAlt: localized(event, "image_alt", locale) || undefined,
    title: localized(event, "title", locale),
  });
};

/** An event's page. */
const EventPage = async ({ params }: EventProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  return <EventView locale={locale} slug={slug} />;
};

/** One event's page. */
const EventView = async ({
  locale,
  slug,
}: {
  locale: Locale;
  slug: string;
}) => {
  const event = await load(slug);
  if (!event) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.events" });
  const ti = await getTranslations({ locale, namespace: "web.institutions" });
  const body = localized(event, "body", locale);
  const image = mediaUrl(event.image_path);
  const canceled = event.status === "canceled";
  // A partner that owns the event (Notion's Host) is named under the title,
  // "Hosted by"; the Society's own events have no host line (decisions.md,
  // Events).
  const host = await readPublished(
    ["events", "partners"],
    (c) => events.eventHost(c, event.slug),
    null
  );
  // Who it's with, from the one register (decisions.md, Events): the
  // co-sponsors, then the sponsors in kind, names with logos only.
  const withOrgs = await readPublished(
    ["events", "partners"],
    (c) => events.eventOrganizations(c, event.slug),
    []
  );
  const rowOf = (line: string) =>
    withOrgs.filter((o) => o.line === line).map((o) => acknowledged(o, locale));
  const now = await roughlyNow();
  const upcoming = new Date(event.starts_at).getTime() > now;
  // "How was it?" from the start until 14 days after the end, to who
  // checked in (decisions.md, Events); the page checks the person.
  const asking = !canceled && now < events.feedbackWindow(event).closes;

  // After the event, the booking area gives way to "How was it?" (for who
  // checked in) and the links from the night.
  const feedback = asking ? (
    <EventFeedback
      closes={formatLongDate(
        new Date(events.feedbackWindow(event).closes).toISOString(),
        locale
      )}
      endsAt={event.ends_at}
      eventId={event.id}
      slug={event.slug}
      startsAt={event.starts_at}
    />
  ) : null;

  return (
    <article className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-16">
      {canceled ? null : (
        <JsonLd
          data={eventLd(locale, {
            audience:
              event.entry === "invite"
                ? null
                : await classesText(event.classes, locale, "list"),
            ends_at: event.ends_at,
            image,
            name: localized(event, "title", locale),
            slug: event.slug,
            starts_at: event.starts_at,
            summary: localized(event, "summary", locale),
            venue: localized(event, "venue", locale),
          })}
        />
      )}
      <Link
        className="type-caption underline underline-offset-4"
        href="/events"
      >
        {t("all")}
      </Link>
      <header className="grid gap-3">
        <h1 className="type-display">{localized(event, "title", locale)}</h1>
        {host ? (
          <p className="type-body">
            {t("hostedBy", { partner: localized(host, "name", locale) })}
          </p>
        ) : null}
        <p className="type-body flex flex-wrap gap-x-4 gap-y-1" data-when>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="calendar" />
            {formatLongDate(event.starts_at, locale)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="clock" />
            {event.ends_at
              ? formatClockRange(event.starts_at, event.ends_at, locale)
              : formatClock(event.starts_at, locale)}
          </span>
        </p>
        <ManageLinks
          diwan={`/events/${event.slug}`}
          membership="/account/events"
          membershipLabel="booking"
        />
        {localized(event, "venue", locale) ? (
          <p className="type-body inline-flex items-center gap-1.5">
            <Icon name="map-pin" />
            {localized(event, "venue", locale)}
          </p>
        ) : null}
      </header>
      {canceled ? (
        <p
          className="type-body border-line border-s-4 border-t p-4"
          role="status"
        >
          {t("canceled")}
        </p>
      ) : null}
      {image ? (
        // biome-ignore lint/performance/noImgElement: a published image from the media bucket
        <img
          alt={localized(event, "image_alt", locale)}
          className="w-full"
          height={630}
          src={image}
          width={1200}
        />
      ) : null}
      {localized(event, "summary", locale) ? (
        <p className="type-lede">{localized(event, "summary", locale)}</p>
      ) : null}
      {body ? (
        <div
          className="prose max-w-none"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized with the one rich-text policy
          dangerouslySetInnerHTML={{ __html: sanitizeRichText(body) }}
        />
      ) : null}
      {/* The practical facts once the reader knows what the event is. */}
      {canceled ? null : <GoodToKnow event={event} locale={locale} />}
      {/* Rendered before the start too: the page checks the time and the
          person, so the question shows from the start without a rebuild.
          After the event, the night's links follow it. */}
      {feedback}
      {upcoming ? null : <EventParts event={event} locale={locale} />}
      <EventProgram eventId={event.id} locale={locale} />
      {upcoming ? <EventParts event={event} locale={locale} /> : null}
      <CoSponsoredBy
        className="border-line pt-space-4 border-t"
        dir={getDirection(locale)}
        items={rowOf("cosponsor")}
        label={ti("coSponsoredBy")}
        lang={locale}
      />
      <ThanksTo
        dir={getDirection(locale)}
        items={rowOf("thanks")}
        label={ti("thanksTo")}
        lang={locale}
      />
      {/* Last, so it stays at the foot of the screen until the page ends. */}
      {canceled || !upcoming ? null : (
        <ActionBar>
          <EventBooking
            entry={event.entry}
            eventId={event.id}
            forClasses={t("forClasses", {
              classes: await classesText(event.classes, locale, "list"),
            })}
            guestsBy={events.guestsBookBy(event)}
            slug={event.slug}
          />
        </ActionBar>
      )}
    </article>
  );
};

export default EventPage;
