import { Icon } from "@repo/brand/components/sal/icon";
import type { Locale } from "@repo/internationalization";
import { apiPath } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { events, localized, sanitizeRichText } from "@repo/sal-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EventBooking } from "@/components/event-booking";
import { EventParts } from "@/components/event-parts";
import { ActionBar } from "@/components/frame/action-bar";
import { ManageLinks } from "@/components/manage-links";
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

// /events/<slug> is an event (a month of What's on is /events?month=;
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
  const body = localized(event, "body", locale);
  const image = mediaUrl(event.image_path);
  const cancelled = event.status === "canceled";
  // Held for a partner (Notion's Host, decisions §13).
  const host = await readPublished(
    ["events", "partners"],
    (c) => events.eventHost(c, event.slug),
    null
  );
  const upcoming = new Date(event.starts_at).getTime() > (await roughlyNow());

  return (
    <article className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-16">
      <JsonLd
        data={eventLd(locale, {
          ends_at: event.ends_at,
          image,
          name: localized(event, "title", locale),
          slug: event.slug,
          starts_at: event.starts_at,
          status: event.status,
          summary: localized(event, "summary", locale),
          venue: localized(event, "venue", locale),
        })}
      />
      <Link
        className="type-caption underline underline-offset-4"
        href="/events"
      >
        {t("all")}
      </Link>
      <header className="grid gap-3">
        <h1 className="type-display">{localized(event, "title", locale)}</h1>
        <p className="type-caption flex flex-wrap gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="calendar" />
            {formatLongDate(event.starts_at, locale)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="clock" />
            {formatClock(event.starts_at, locale)}
            {event.ends_at ? ` – ${formatClock(event.ends_at, locale)}` : ""}
          </span>
        </p>
        <p className="type-body">
          {t(`ways.${event.entry === "open" ? "open" : "rsvp"}`)}
        </p>
        <ManageLinks
          diwan={`/events/${event.slug}`}
          membership="/account/calendar"
          membershipLabel="booking"
        />
        {host ? (
          <p className="type-body">
            {t("heldWith", { partner: localized(host, "name", locale) })}
          </p>
        ) : null}
        {localized(event, "venue", locale) ? (
          <p className="type-body inline-flex items-center gap-1.5">
            <Icon name="map-pin" />
            {localized(event, "venue", locale)}
          </p>
        ) : null}
      </header>
      {cancelled || !upcoming ? null : (
        <ActionBar>
          <EventBooking
            eventId={event.id}
            open={event.entry === "open"}
            slug={event.slug}
          />
          <a
            className="link type-body"
            href={apiPath(`/calendar/events/${event.slug}.ics?lang=${locale}`)}
          >
            {t("addToCalendar")}
          </a>
        </ActionBar>
      )}
      {upcoming && !cancelled ? (
        <p className="type-caption">
          {event.entry === "open" ? t("remindHint") : t("rsvpHint")}
        </p>
      ) : null}
      {cancelled ? (
        <p
          className="type-body border-line border-s-4 border-t p-4"
          role="status"
        >
          {t("cancelled")}
        </p>
      ) : null}
      {image ? (
        // biome-ignore lint/performance/noImgElement: a published image from the media bucket
        <img alt="" className="w-full" height={630} src={image} width={1200} />
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
      <EventParts event={event} locale={locale} />
    </article>
  );
};

export default EventPage;
