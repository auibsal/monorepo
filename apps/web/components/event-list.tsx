import { Icon } from "@repo/design-system/components/sal/icon";
import type { Locale } from "@repo/internationalization";
import { formatClock, formatDayParts } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { localized } from "@repo/sal-data";
import type { ReactNode } from "react";

export interface DatedItem {
  /** The day the row is filed under (an instant; shown in Baghdad). */
  at: string;
  /** Another site's page (AUIB's calendar): a plain link, labeled. */
  external?: { label: string } | null;
  href: string;
  key: string;
  /** The title's language, when it isn't the page's (AUIB's English). */
  lang?: string;
  /** One line under the title. */
  line?: string | null;
  /** Something else for the end of the row (a closing date). */
  place?: string | null;
  /** The time, after the clock, at the end of the row. */
  time?: string | null;
  title: string;
  /** The place, after the pin, at the end of the row. */
  venue?: string | null;
}

const ROW =
  "group grid grid-cols-[4.5rem_1fr] gap-x-space-4 gap-y-1 py-space-4 sm:grid-cols-[8rem_1fr_auto] sm:items-baseline";

const RowLink = ({
  children,
  external,
  href,
}: {
  children: ReactNode;
  external?: DatedItem["external"];
  href: string;
}) =>
  external ? (
    <a aria-label={external.label} className={ROW} href={href} rel="noopener">
      {children}
    </a>
  ) : (
    <Link className={ROW} href={href}>
      {children}
    </Link>
  );

/**
 * The dated list: a large Light day number with the weekday and month
 * under it, the title and one line, and the place (a pin) and time (a
 * clock) at the end, each row on a hairline.
 */
export const DatedList = ({
  items,
  locale,
}: {
  items: readonly DatedItem[];
  locale: Locale;
}) => (
  <ul className="grid divide-y divide-line">
    {items.map((item) => {
      const { day, month, weekday } = formatDayParts(item.at, locale);
      return (
        <li key={item.key}>
          <RowLink external={item.external} href={item.href}>
            <span className="row-span-3 grid content-start gap-1 sm:row-span-1">
              <span className="font-light text-[2.75rem] leading-none tracking-tight">
                {day}
              </span>
              <span className="type-label text-text-secondary">
                {weekday} · {month}
              </span>
            </span>
            <span className="grid gap-1">
              <span
                className="font-normal text-xl leading-snug group-hover:text-accent"
                lang={item.lang}
              >
                {item.title}
                {item.external ? (
                  <Icon
                    className="ms-1.5 align-[-0.15em]"
                    name="arrow-up-right"
                  />
                ) : null}
              </span>
              {item.line ? (
                <span className="type-caption text-text-secondary">
                  {item.line}
                </span>
              ) : null}
            </span>
            {item.place || item.venue || item.time ? (
              <span className="type-caption flex flex-wrap gap-x-4 gap-y-1 text-text-secondary sm:justify-end">
                {item.venue ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="map-pin" />
                    {item.venue}
                  </span>
                ) : null}
                {item.time ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="clock" />
                    {item.time}
                  </span>
                ) : null}
                {item.place ? <span>{item.place}</span> : null}
              </span>
            ) : null}
          </RowLink>
        </li>
      );
    })}
  </ul>
);

interface EventRow {
  id: string;
  slug: string;
  starts_at: string;
  summary_ar: string | null;
  summary_en: string | null;
  title_ar: string;
  title_en: string;
  venue_ar: string | null;
  venue_en: string | null;
  readonly [key: string]: unknown;
}

/** Events as dated rows: what, one line, where and when. */
export const eventItems = (
  events: readonly EventRow[],
  locale: Locale
): DatedItem[] =>
  events.map((event) => ({
    at: event.starts_at,
    href: `/events/${event.slug}`,
    key: event.id,
    line: localized(event, "summary", locale),
    time: formatClock(event.starts_at, locale),
    title: localized(event, "title", locale),
    venue: localized(event, "venue", locale) || null,
  }));

export const EventList = ({
  events,
  locale,
}: {
  events: readonly EventRow[];
  locale: Locale;
}) => <DatedList items={eventItems(events, locale)} locale={locale} />;
