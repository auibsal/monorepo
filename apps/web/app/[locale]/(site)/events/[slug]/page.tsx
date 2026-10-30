import { Icon } from "@repo/design-system/components/sal/icon";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { apiPath, localizedPath } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import {
  events,
  localized,
  programmes,
  sanitizeRichText,
} from "@repo/sal-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ActionBar } from "@/components/frame/action-bar";
import { SecondChapterGive } from "@/components/second-chapter-give";
import {
  loadSeries,
  SeriesView,
  seriesMetadata,
  seriesPath,
} from "@/components/series";
import { eventLd, JsonLd } from "@/lib/json-ld";
import { mediaUrl } from "@/lib/media";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface EventProps {
  readonly params: Promise<{ locale: Locale; slug: string }>;
  readonly searchParams: Promise<{ month?: string }>;
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Rendered on request: a program's page reads the month it shows from
// `?month=`. The Supabase reads behind it stay cached by tag until an event
// or program is published.

type PublicEvent = Awaited<ReturnType<typeof events.publicEvent>>;

const load = (slug: string): Promise<PublicEvent | null> =>
  SLUG.test(slug)
    ? readPublished(["events"], (c) => events.publicEvent(c, slug), null)
    : Promise.resolve(null);

export const generateMetadata = async ({
  params,
}: EventProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  const series = await loadSeries(slug);
  if (series) {
    return seriesMetadata(locale, series);
  }
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

/**
 * An event, or a program: programs and events share the addresses under
 * /events (the database keeps them apart), so /events/salon is the Salon
 * as a series and /events/salon-2026-12-01 one of its sessions.
 */
const EventPage = async ({ params, searchParams }: EventProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const series = await loadSeries(slug);
  if (series) {
    const { month } = await searchParams;
    return (
      <SeriesView locale={locale} month={month} series={series}>
        {series.slug === "second-chapter" ? (
          <SecondChapterGive locale={locale} />
        ) : null}
      </SeriesView>
    );
  }
  const event = await load(slug);
  if (!event) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.events" });
  const body = localized(event, "body", locale);
  const image = mediaUrl(event.image_path);
  const cancelled = event.status === "cancelled";
  const upcoming = new Date(event.starts_at).getTime() > Date.now();
  // The program the session belongs to, named in the facts and linked.
  const program = event.programme_id
    ? (
        await readPublished(
          ["programmes"],
          async (c) => (await programmes.programmes(c)) ?? [],
          []
        )
      ).find(
        (p) => p.id === event.programme_id && programmes.isListedProgram(p)
      )
    : undefined;

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
        {program ? (
          <p className="type-body">
            <Link
              className="underline underline-offset-4 hover:text-accent"
              href={seriesPath(program.slug)}
            >
              {localized(program, "name", locale)}
            </Link>
          </p>
        ) : null}
        <p className="type-body">
          {t(`ways.${event.entry === "open" ? "open" : "rsvp"}`)}
        </p>
        {localized(event, "venue", locale) ? (
          <p className="type-body inline-flex items-center gap-1.5">
            <Icon name="map-pin" />
            {localized(event, "venue", locale)}
          </p>
        ) : null}
      </header>
      {cancelled || !upcoming ? null : (
        <ActionBar>
          <Button asChild>
            <a
              href={`${localizedPath(locale, "/membership/calendar")}#${event.slug}`}
            >
              {event.entry === "open" ? t("remind") : t("rsvp")}
            </a>
          </Button>
          <Button asChild variant="outline">
            <a
              href={apiPath(
                `/calendar/events/${event.slug}.ics?lang=${locale}`
              )}
            >
              {t("addToCalendar")}
            </a>
          </Button>
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
    </article>
  );
};

export default EventPage;
