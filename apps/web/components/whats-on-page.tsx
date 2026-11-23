import { project } from "@repo/config";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { DatedList } from "@/components/event-list";
import { ManageLinks } from "@/components/manage-links";
import { PageHeader } from "@/components/section";
import { loadProgram } from "@/components/series";
import {
  calendarItems,
  MonthCalendar,
  MonthSection,
  nextAfter,
} from "@/components/whats-on";
import { events } from "@/lib/data";
import { readPublished } from "@/lib/supabase";
import { roughlyNow } from "@/lib/this-year";
import { type Month, monthFrom, monthParam } from "@/lib/whats-on";

const HTTP_SCHEME = /^https?:/u;
/** AUIB's own events calendar. */
const AUIB_EVENTS = "https://auib.edu.iq/events/";

/** Who hosts the events a list can be narrowed to (`/events?host=company`). */
const HOSTS = ["company"] as const;
export type Host = (typeof HOSTS)[number];
export const isHost = (value: unknown): value is Host =>
  (HOSTS as readonly unknown[]).includes(value);

/**
 * Where a month of Events is: filters are query strings (decisions §6),
 * /events?month=2026-11 and /events?month=2026-11&host=company.
 */
export const whatsOnPath = (month: Month, host?: Host) => {
  const query = new URLSearchParams({ month: monthParam(month) });
  if (host) {
    query.set("host", host);
  }
  return `/events?${query.toString()}`;
};

const YEAR_MS = 366 * 86_400_000;
/** How many past events the collection lists. */
const PAST = 12;

/**
 * Events (decisions §6; the U.S. Web Design System's collection, its
 * calendar display): the events to come as a dated list, then the past
 * ones, on every screen. A month is a filter (/events?month=2026-11), the
 * same list for that month. The public see members-only events as
 * teasers; members book from the members' events page. AUIB's own
 * calendar is one link, not dates beside the Society's (decisions §10).
 */
export const WhatsOn = async ({
  host,
  locale,
  month,
}: {
  host?: Host;
  locale: Locale;
  /** A month asked for in the address; none shows what is coming. */
  month?: Month;
}) => {
  const now = new Date(await roughlyNow());
  const t = await getTranslations({ locale, namespace: "web.events" });
  const hostId = host ? (await loadProgram(host))?.id : undefined;
  const from = month?.from ?? new Date(now.getTime() - YEAR_MS);
  const to = month?.to ?? new Date(now.getTime() + YEAR_MS);
  const all = await readPublished(
    ["events"],
    (c) => events.calendar(c, from, to),
    []
  );
  const rows = hostId ? all.filter((row) => row.program_id === hostId) : all;
  const started = (row: { starts_at: string }) =>
    Date.parse(row.starts_at) < now.getTime();
  const coming = rows.filter((row) => !started(row));
  const past = rows.filter(started).reverse().slice(0, PAST);
  const thisMonth = monthFrom(undefined, now);
  const feed = `${project.url.replace(HTTP_SCHEME, "webcal:")}/calendar.ics?lang=${locale}`;
  const href = (next: Month) => whatsOnPath(next, host);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:py-24">
      <PageHeader lede={t("lede")} title={t("title")}>
        <ManageLinks
          diwan="/events"
          membership="/account/events"
          membershipLabel="booking"
        />
      </PageHeader>

      <p className="flex flex-wrap gap-x-5 gap-y-2">
        {host ? (
          <Link
            className="link type-caption"
            href={month ? whatsOnPath(month) : "/events"}
          >
            {t("allEvents")}
          </Link>
        ) : null}
        <a className="link type-caption" href={AUIB_EVENTS}>
          {t("auibCalendar")}
        </a>
      </p>

      {month ? (
        <MonthSection
          hrefFor={(m) => href(monthFrom(m, now))}
          locale={locale}
          month={month}
        >
          <MonthCalendar
            locale={locale}
            month={month}
            next={rows.length === 0 ? await nextAfter(month, hostId) : null}
            rows={rows}
          />
        </MonthSection>
      ) : (
        <>
          <section aria-labelledby="coming" className="gap-space-5 grid">
            <div className="border-line pt-space-4 flex flex-wrap items-baseline justify-between gap-4 border-t">
              <h2 className="type-title font-light" id="coming">
                {t("coming")}
              </h2>
              <Link className="link type-caption" href={href(thisMonth)}>
                {t("byMonth")}
              </Link>
            </div>
            {coming.length > 0 ? (
              <DatedList
                items={await calendarItems(coming, locale)}
                locale={locale}
              />
            ) : (
              <p className="type-body text-text-secondary">{t("noneComing")}</p>
            )}
          </section>
          {past.length > 0 ? (
            <section aria-labelledby="past" className="gap-space-5 grid">
              <h2
                className="type-title border-line pt-space-4 border-t font-light"
                id="past"
              >
                {t("past")}
              </h2>
              <DatedList
                items={await calendarItems(past, locale)}
                locale={locale}
              />
            </section>
          ) : null}
        </>
      )}

      <p className="type-caption border-line pt-space-4 border-t">
        <a className="link" href={feed}>
          {t("subscribe")}
        </a>{" "}
        <span className="text-text-secondary">{t("subscribeHint")}</span>
      </p>
    </div>
  );
};
