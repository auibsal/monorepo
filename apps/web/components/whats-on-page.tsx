import { project } from "@repo/config";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { ManageLinks } from "@/components/manage-links";
import { PageHeader } from "@/components/section";
import { loadProgramme } from "@/components/series";
import { MonthCalendar, MonthSection, nextAfter } from "@/components/whats-on";
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

/**
 * Events: the Society's events in one calendar, a month at a time. The
 * public see members-only events as teasers; members book from the
 * members' events page. AUIB's own calendar is one link, not dates beside
 * the Society's (decisions §10).
 */
export const WhatsOn = async ({
  host,
  locale,
  month,
}: {
  host?: Host;
  locale: Locale;
  month: Month;
}) => {
  const now = new Date(await roughlyNow());
  const t = await getTranslations({ locale, namespace: "web.events" });
  const hostId = host ? (await loadProgramme(host))?.id : undefined;
  const all = await readPublished(
    ["events"],
    (c) => events.calendar(c, month.from, month.to),
    []
  );
  const rows = hostId ? all.filter((row) => row.programme_id === hostId) : all;
  const upcoming = rows.length === 0 ? await nextAfter(month, hostId) : null;
  const feed = `${project.url.replace(HTTP_SCHEME, "webcal:")}/calendar.ics?lang=${locale}`;
  const href = (next: Month) => whatsOnPath(next, host);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:py-24">
      <PageHeader lede={t("lede")} title={t("title")}>
        <ManageLinks
          diwan="/events"
          membership="/account/calendar"
          membershipLabel="booking"
        />
      </PageHeader>

      <p className="flex flex-wrap gap-x-5 gap-y-2">
        {host ? (
          <Link className="link type-caption" href={whatsOnPath(month)}>
            {t("allEvents")}
          </Link>
        ) : null}
        <a className="link type-caption" href={AUIB_EVENTS}>
          {t("auibCalendar")}
        </a>
      </p>

      <MonthSection
        hrefFor={(m) => href(monthFrom(m, now))}
        locale={locale}
        month={month}
      >
        <MonthCalendar
          locale={locale}
          month={month}
          next={upcoming}
          rows={rows}
        />
      </MonthSection>

      <p className="type-caption border-line pt-space-4 border-t">
        <a className="link" href={feed}>
          {t("subscribe")}
        </a>{" "}
        <span className="text-text-secondary">{t("subscribeHint")}</span>
      </p>
    </div>
  );
};
