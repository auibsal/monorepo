import { project } from "@repo/config";
import type { Locale } from "@repo/internationalization";
import { formatMonth } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { events, localized, programmes } from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/section";
import { MonthCalendar } from "@/components/whats-on";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";
import { monthFrom, monthParam, shiftMonth } from "@/lib/whats-on";

const HTTP_SCHEME = /^https?:/;

interface EventsProps {
  readonly params: Promise<{ locale: Locale }>;
  readonly searchParams: Promise<{
    auib?: string;
    month?: string;
    series?: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: EventsProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.events" });
  return localizedMetadata(locale, "/events", {
    description: t("lede"),
    title: t("title"),
  });
};

/**
 * What's on: programs and events in one calendar, a month at a time, with
 * each program as a series to filter by. The public see members-only
 * events as teasers; members book from the members' events page. AUIB's
 * own dates (the hourly sync of the University's calendar) sit beside the
 * Society's unless a series is chosen or the visitor hides them.
 */
const EventsPage = async ({ params, searchParams }: EventsProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const t = await getTranslations({ locale, namespace: "web.events" });
  const month = monthFrom(query.month);
  const withUniversity = query.auib !== "off";
  const [rows, all, university] = await Promise.all([
    readPublished(
      ["events"],
      (c) => events.calendar(c, month.from, month.to),
      []
    ),
    readPublished(["programmes"], (c) => programmes.programmes(c), []),
    readPublished(
      ["events"],
      (c) => events.universityCalendar(c, month.from, month.to),
      []
    ),
  ]);
  const series = (all ?? []).filter((p) => p.is_active);
  const chosen = series.find((p) => p.slug === query.series);
  const shown = chosen
    ? rows.filter((row) => row.programme_id === chosen.id)
    : rows;
  const feed = `${project.url.replace(HTTP_SCHEME, "webcal:")}/calendar.ics?lang=${locale}`;

  // Links keep the month, the series and the AUIB choice unless they
  // change one of them.
  const href = (next: {
    month?: string;
    series?: string | null;
    university?: boolean;
  }) => {
    const slug = next.series === undefined ? chosen?.slug : next.series;
    const showUniversity = next.university ?? withUniversity;
    return {
      pathname: "/events",
      query: {
        month: next.month ?? monthParam(month),
        ...(slug ? { series: slug } : {}),
        ...(showUniversity ? {} : { auib: "off" }),
      },
    };
  };
  const previous = shiftMonth(month, -1);
  const following = shiftMonth(month, 1);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:py-24">
      <PageHeader lede={t("lede")} title={t("title")} />

      <nav aria-label={t("series")} className="flex flex-wrap gap-x-5 gap-y-2">
        <Link
          aria-current={chosen ? undefined : "page"}
          className="link type-caption aria-[current=page]:text-accent"
          href={href({ series: null })}
        >
          {t("everything")}
        </Link>
        {series.map((p) => (
          <Link
            aria-current={chosen?.id === p.id ? "page" : undefined}
            className="link type-caption aria-[current=page]:text-accent"
            href={href({ series: p.slug })}
            key={p.id}
          >
            {localized(p, "name", locale)}
          </Link>
        ))}
      </nav>

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
              href={href({ month: monthParam(previous) })}
            >
              {formatMonth(previous.from, locale)}
            </Link>
            <Link
              aria-label={t("next", {
                month: formatMonth(following.from, locale),
              })}
              className="link type-caption"
              href={href({ month: monthParam(following) })}
            >
              {formatMonth(following.from, locale)}
            </Link>
          </p>
        </div>
        {chosen ? (
          <p className="type-body text-text-secondary">
            <Link className="link" href={`/programs/${chosen.slug}`}>
              {t("aboutSeries", { series: localized(chosen, "name", locale) })}
            </Link>
          </p>
        ) : null}
        <MonthCalendar
          locale={locale}
          month={month}
          rows={shown}
          university={chosen || !withUniversity ? [] : university}
        />
        {chosen ? null : (
          <p className="type-caption">
            <Link className="link" href={href({ university: !withUniversity })}>
              {withUniversity ? t("hideAuib") : t("showAuib")}
            </Link>
          </p>
        )}
      </section>

      <p className="type-caption border-line border-t pt-space-4">
        <a className="link" href={feed}>
          {t("subscribe")}
        </a>{" "}
        <span className="text-text-secondary">{t("subscribeHint")}</span>
      </p>
    </div>
  );
};

export default EventsPage;
