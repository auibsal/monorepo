import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { events, localized, programmes } from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/section";
import { MonthCalendar, MonthSection, nextAfter } from "@/components/whats-on";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";
import { monthFrom } from "@/lib/whats-on";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export type Series = NonNullable<
  Awaited<ReturnType<typeof programmes.programmes>>
>[number];

/** The active program at /events/<slug>, or null. */
export const loadSeries = async (slug: string): Promise<Series | null> => {
  if (!SLUG.test(slug)) {
    return null;
  }
  const all: Awaited<ReturnType<typeof programmes.programmes>> =
    await readPublished(["programmes"], (c) => programmes.programmes(c), []);
  return (all ?? []).find((p) => p.slug === slug && p.is_active) ?? null;
};

export const seriesMetadata = (locale: Locale, series: Series): Metadata =>
  localizedMetadata(locale, `/events/${series.slug}`, {
    description: localized(series, "summary", locale),
    title: localized(series, "name", locale),
  });

/**
 * A program as a series in What's on (owner, 2026-10-25): what it is, and
 * its own month of the calendar, with the way to the months either side.
 * `children` adds what the program has besides dates (the Company's
 * productions).
 */
export const SeriesView = async ({
  children,
  locale,
  month: monthValue,
  series,
}: {
  children?: ReactNode;
  locale: Locale;
  month?: string;
  series: Series;
}) => {
  const t = await getTranslations({ locale, namespace: "web.events" });
  const month = monthFrom(monthValue);
  const rows = await readPublished(
    ["events"],
    (c) => events.calendar(c, month.from, month.to),
    []
  );
  const own = rows.filter((row) => row.programme_id === series.id);
  const next = own.length === 0 ? await nextAfter(month, series.id) : null;
  const pathname = `/events/${series.slug}`;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:py-24">
      <PageHeader
        lede={localized(series, "summary", locale)}
        title={localized(series, "name", locale)}
      >
        {localized(series, "rhythm", locale) ? (
          <p className="type-body">{localized(series, "rhythm", locale)}</p>
        ) : null}
      </PageHeader>
      <MonthSection
        hrefFor={(m) => ({ pathname, query: { month: m } })}
        locale={locale}
        month={month}
      >
        <MonthCalendar locale={locale} month={month} next={next} rows={own} />
      </MonthSection>
      {children}
      <p className="border-line border-t pt-space-4">
        <Link className="link type-caption" href="/events">
          {t("all")}
        </Link>
      </p>
    </div>
  );
};
