import type { Locale } from "@repo/internationalization";
import {
  formatClock,
  formatMonth,
  formatWeekday,
  toZonedDateValue,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { type events, localized } from "@repo/sal-data";
import { getTranslations } from "next-intl/server";
import { type DatedItem, DatedList } from "@/components/event-list";
import { byDay, type Month, monthWeeks, weekdayColumns } from "@/lib/whats-on";

type Row = events.CalendarEvent;

/**
 * Where a row leads: the event's page, or, for a members-only teaser, the
 * members' events page (which asks the visitor to sign in).
 */
export const rowHref = (row: Row) =>
  row.teaser || row.members_only
    ? `/events/book#${row.slug}`
    : `/events/${row.slug}`;

type WayKey = "cancelled" | "members" | "open" | "rsvp" | "invite";

/** The one line under each title: how to come. */
export const wayOf = (row: Row): WayKey => {
  if (row.status === "cancelled") {
    return "cancelled";
  }
  if (row.entry === "invite") {
    return "invite";
  }
  if (row.teaser) {
    return "members";
  }
  return row.entry === "open" ? "open" : "rsvp";
};

/** The month as a grid (wide screens) and as a dated list (phones). */
export const MonthCalendar = async ({
  locale,
  month,
  rows,
}: {
  locale: Locale;
  month: Month;
  rows: readonly Row[];
}) => {
  const t = await getTranslations({ locale, namespace: "web.events" });
  const days = byDay(rows);
  const today = toZonedDateValue(new Date());
  const items: DatedItem[] = rows.map((row) => ({
    at: row.starts_at,
    href: rowHref(row),
    key: row.id,
    line: t(`ways.${wayOf(row)}`),
    place: [
      row.teaser ? null : localized(row, "venue", locale),
      formatClock(row.starts_at, locale),
    ]
      .filter(Boolean)
      .join(" · "),
    title: localized(row, "title", locale),
  }));

  if (rows.length === 0) {
    return (
      <p className="type-body text-text-secondary">
        {t("noneMonth", { month: formatMonth(month.from, locale) })}
      </p>
    );
  }

  return (
    <>
      <table className="hidden w-full table-fixed border-collapse md:table">
        <caption className="sr-only">{formatMonth(month.from, locale)}</caption>
        <thead>
          <tr>
            {weekdayColumns().map((day) => (
              <th
                className="type-label pb-space-2 text-start font-medium text-text-secondary"
                key={day.toISOString()}
                scope="col"
              >
                {formatWeekday(day, locale, "short")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthWeeks(month).map((week) => (
            <tr className="border-line border-t" key={week.join()}>
              {week.map((day, index) => (
                <td className="h-28 align-top" key={day ?? `empty-${index}`}>
                  {day ? (
                    <div className="grid content-start gap-1 py-space-2 pe-space-2">
                      <span
                        aria-current={day === today ? "date" : undefined}
                        className="font-light text-2xl leading-none aria-[current=date]:text-accent"
                      >
                        {Number(day.slice(8))}
                      </span>
                      {(days.get(day) ?? []).map((row) => (
                        <Link
                          className="grid text-sm leading-snug hover:text-accent"
                          href={rowHref(row)}
                          key={row.id}
                        >
                          <span>{localized(row, "title", locale)}</span>
                          <span className="type-caption text-text-secondary">
                            {formatClock(row.starts_at, locale)} ·{" "}
                            {t(`ways.${wayOf(row)}`)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="md:hidden">
        <DatedList items={items} locale={locale} />
      </div>
    </>
  );
};
