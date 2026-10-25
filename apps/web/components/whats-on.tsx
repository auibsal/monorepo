import type { Locale } from "@repo/internationalization";
import {
  formatClock,
  formatLongDate,
  formatMonth,
  formatWeekday,
  toZonedDateValue,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { events, localized, programmes } from "@repo/sal-data";
import { getTranslations } from "next-intl/server";
import type { ComponentProps, ReactNode } from "react";
import { type DatedItem, DatedList } from "@/components/event-list";
import { Section } from "@/components/section";
import { readPublished } from "@/lib/supabase";
import {
  byDay,
  type Month,
  monthParam,
  monthWeeks,
  shiftMonth,
  weekdayColumns,
} from "@/lib/whats-on";

type Row = events.CalendarEvent;
type UniversityRow = events.UniversityEvent;

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

const YEAR = 366 * 24 * 60 * 60 * 1000;

/**
 * The first event to come after an empty month (or from today, for a month
 * already past), within a year: one program's, or any. Canceled dates don't
 * count.
 */
export const nextAfter = async (
  month: Month,
  programmeId?: string
): Promise<Row | null> => {
  const from = new Date(Math.max(Date.now(), month.from.getTime()));
  const rows = await readPublished(
    ["events"],
    (c) => events.calendar(c, from, new Date(from.getTime() + YEAR)),
    []
  );
  return (
    rows.find(
      (row) =>
        row.status !== "cancelled" &&
        (!programmeId || row.programme_id === programmeId)
    ) ?? null
  );
};

/**
 * The month as a grid (wide screens) and as a dated list (phones): the
 * Society's events, and AUIB's own dates beside them, quieter, each linking
 * to the University's page. AUIB publishes its calendar in English only, so
 * those titles keep their language on the Arabic pages.
 */
export const MonthCalendar = async ({
  locale,
  month,
  next = null,
  rows,
  university = [],
}: {
  locale: Locale;
  month: Month;
  /** What comes next, shown when the month is empty (`nextAfter`). */
  next?: Row | null;
  rows: readonly Row[];
  university?: readonly UniversityRow[];
}) => {
  const t = await getTranslations({ locale, namespace: "web.events" });
  const days = byDay(rows);
  const universityDays = byDay(university);
  const today = toZonedDateValue(new Date());
  const universityWhen = (row: UniversityRow) =>
    row.all_day ? t("allDay") : formatClock(row.starts_at, locale);
  const universityItems: DatedItem[] = university.map((row) => ({
    at: row.starts_at,
    external: row.url ? { label: t("auibLink", { title: row.title }) } : null,
    href: row.url ?? "https://auib.edu.iq/events/",
    key: row.id,
    lang: "en",
    line: t("auib"),
    place: universityWhen(row),
    title: row.title,
  }));
  const societyItems: DatedItem[] = rows.map((row) => ({
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

  const items = [...societyItems, ...universityItems].sort((a, b) =>
    a.at.localeCompare(b.at)
  );

  if (items.length === 0) {
    return (
      <p className="type-body text-text-secondary">
        {next ? (
          <>
            {t("nextLabel")}{" "}
            <Link className="link text-text" href={rowHref(next)}>
              {localized(next, "title", locale)}
            </Link>
            {t("nextOn", { date: formatLongDate(next.starts_at, locale) })}
          </>
        ) : (
          t("noneMonth", { month: formatMonth(month.from, locale) })
        )}
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
                      {(universityDays.get(day) ?? []).map((row) => (
                        <a
                          aria-label={t("auibLink", { title: row.title })}
                          className="grid text-sm text-text-secondary leading-snug hover:text-accent"
                          href={row.url ?? "https://auib.edu.iq/events/"}
                          key={row.id}
                          rel="noopener"
                        >
                          <span lang="en">{row.title}</span>
                          <span className="type-caption">
                            {universityWhen(row)} · {t("auib")}
                          </span>
                        </a>
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

type Href = ComponentProps<typeof Link>["href"];

/**
 * A month of What's on with the way to the months either side: the whole
 * calendar at /events, one program's at /events/<program>.
 */
export const MonthSection = async ({
  children,
  hrefFor,
  locale,
  month,
}: {
  children: ReactNode;
  hrefFor: (month: string) => Href;
  locale: Locale;
  month: Month;
}) => {
  const t = await getTranslations({ locale, namespace: "web.events" });
  const previous = shiftMonth(month, -1);
  const following = shiftMonth(month, 1);
  return (
    <section aria-labelledby="month" className="grid gap-space-5">
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-line border-t pt-space-4">
        <h2 className="type-title font-light" id="month">
          {formatMonth(month.from, locale)}
        </h2>
        <p className="flex gap-5">
          <Link
            aria-label={t("previous", {
              month: formatMonth(previous.from, locale),
            })}
            className="link type-caption"
            href={hrefFor(monthParam(previous))}
          >
            {formatMonth(previous.from, locale)}
          </Link>
          <Link
            aria-label={t("next", {
              month: formatMonth(following.from, locale),
            })}
            className="link type-caption"
            href={hrefFor(monthParam(following))}
          >
            {formatMonth(following.from, locale)}
          </Link>
        </p>
      </div>
      {children}
    </section>
  );
};

type Programme = NonNullable<
  Awaited<ReturnType<typeof programmes.programmes>>
>[number];

/**
 * Every program, as it used to be listed at /programs: the flagships, the
 * weekly evenings and the specials, each linking to its own calendar.
 */
export const SeriesList = async ({
  locale,
  rows,
}: {
  locale: Locale;
  rows: readonly Programme[];
}) => {
  const t = await getTranslations({ locale, namespace: "web.programmes" });
  const group = (name: programmes.ProgrammeGroup) =>
    rows.filter((p) => programmes.programmeGroup(p) === name);

  // Flagship names in Light Italic accent; the rest in Regular ink.
  const item = (p: Programme) => {
    const flagship = programmes.programmeGroup(p) === "flagship";
    return (
      <li
        className="grid content-start gap-2 border-line border-t py-space-4"
        key={p.id}
      >
        <h4
          className={
            flagship ? "type-title type-accent font-light!" : "type-heading"
          }
        >
          <Link className="hover:underline" href={`/events/${p.slug}`}>
            {localized(p, "name", locale)}
          </Link>
        </h4>
        {localized(p, "summary", locale) ? (
          <p className="type-body max-w-[44ch] text-text-secondary">
            {localized(p, "summary", locale)}
          </p>
        ) : null}
      </li>
    );
  };

  const weekly = group("weekly");
  const specials = group("special");

  return (
    <Section id="series" title={t("title")}>
      <div className="grid gap-12">
        <div className="grid gap-2" id="flagship">
          <h3 className="type-heading">{t("major")}</h3>
          <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
            {group("flagship").map(item)}
          </ul>
        </div>
        {weekly.length > 0 ? (
          <div className="grid gap-2" id="weekly">
            <h3 className="type-heading">{t("weekly")}</h3>
            <p className="type-body text-text-secondary">{t("weeklyNote")}</p>
            <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-4">
              {weekly.map(item)}
            </ul>
          </div>
        ) : null}
        {specials.length > 0 ? (
          <div className="grid gap-2" id="specials">
            <h3 className="type-heading">{t("specials")}</h3>
            <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
              {specials.map(item)}
            </ul>
          </div>
        ) : null}
      </div>
    </Section>
  );
};
