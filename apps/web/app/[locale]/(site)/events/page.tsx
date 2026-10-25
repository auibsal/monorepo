import { project } from "@repo/config";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { events, localized, programmes } from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/section";
import { MonthCalendar, MonthSection, SeriesList } from "@/components/whats-on";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";
import { monthFrom, monthParam } from "@/lib/whats-on";

const HTTP_SCHEME = /^https?:/;

interface EventsProps {
  readonly params: Promise<{ locale: Locale }>;
  readonly searchParams: Promise<{
    auib?: string;
    month?: string;
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
 * What's on: programs and events in one calendar, a month at a time. Each
 * program has its own calendar at /events/<program>; every program is listed
 * under the month. The public see members-only events as teasers; members
 * book from the members' events page. AUIB's own dates (the hourly sync of
 * the University's calendar) sit beside the Society's unless the visitor
 * hides them.
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
  const feed = `${project.url.replace(HTTP_SCHEME, "webcal:")}/calendar.ics?lang=${locale}`;

  // Links keep the month and the AUIB choice unless they change one.
  const href = (next: { month?: string; university?: boolean }) => {
    const showUniversity = next.university ?? withUniversity;
    return {
      pathname: "/events",
      query: {
        month: next.month ?? monthParam(month),
        ...(showUniversity ? {} : { auib: "off" }),
      },
    };
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:py-24">
      <PageHeader lede={t("lede")} title={t("title")} />

      <nav aria-label={t("series")} className="flex flex-wrap gap-x-5 gap-y-2">
        <Link
          aria-current="page"
          className="link type-caption aria-[current=page]:text-accent"
          href={href({})}
        >
          {t("everything")}
        </Link>
        {series.map((p) => (
          <Link
            className="link type-caption"
            href={`/events/${p.slug}`}
            key={p.id}
          >
            {localized(p, "name", locale)}
          </Link>
        ))}
      </nav>

      <MonthSection
        hrefFor={(m) => href({ month: m })}
        locale={locale}
        month={month}
      >
        <MonthCalendar
          locale={locale}
          month={month}
          rows={rows}
          university={withUniversity ? university : []}
        />
        <p className="type-caption">
          <Link className="link" href={href({ university: !withUniversity })}>
            {withUniversity ? t("hideAuib") : t("showAuib")}
          </Link>
        </p>
      </MonthSection>

      <SeriesList locale={locale} rows={series} />

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
