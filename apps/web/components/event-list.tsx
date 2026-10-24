import type { Locale } from "@repo/internationalization";
import { formatClock, formatDayParts } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { localized } from "@repo/sal-data";

export interface DatedItem {
  /** The day the row is filed under (an instant; shown in Baghdad). */
  at: string;
  href: string;
  key: string;
  /** One line under the title. */
  line?: string | null;
  /** Place and time, at the end of the row. */
  place?: string | null;
  title: string;
}

/**
 * The dated list: a large Light day number with the weekday and month
 * under it, the title and one line, and the place and time at the end, each
 * row on a hairline.
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
          <Link
            className="group grid grid-cols-[4.5rem_1fr] gap-x-space-4 gap-y-1 py-space-4 sm:grid-cols-[8rem_1fr_auto] sm:items-baseline"
            href={item.href}
          >
            <span className="row-span-3 grid content-start gap-1 sm:row-span-1">
              <span className="font-light text-[2.75rem] leading-none tracking-tight">
                {day}
              </span>
              <span className="type-label text-text-secondary">
                {weekday} · {month}
              </span>
            </span>
            <span className="grid gap-1">
              <span className="font-normal text-xl leading-snug group-hover:text-accent">
                {item.title}
              </span>
              {item.line ? (
                <span className="type-caption text-text-secondary">
                  {item.line}
                </span>
              ) : null}
            </span>
            {item.place ? (
              <span className="type-caption text-text-secondary sm:text-end">
                {item.place}
              </span>
            ) : null}
          </Link>
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
    place: [
      localized(event, "venue", locale),
      formatClock(event.starts_at, locale),
    ]
      .filter(Boolean)
      .join(" · "),
    title: localized(event, "title", locale),
  }));

export const EventList = ({
  events,
  locale,
}: {
  events: readonly EventRow[];
  locale: Locale;
}) => <DatedList items={eventItems(events, locale)} locale={locale} />;
