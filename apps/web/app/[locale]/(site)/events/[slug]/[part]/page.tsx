import type { Locale } from "@repo/internationalization";
import { events, localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OccasionPage, occasionVisible } from "@/components/occasion-page";
import { BookCircleShelfList, ProgramPast } from "@/components/program-page";
import { loadSeries, SeriesView, seriesMetadata } from "@/components/series";
import { WhatsOn } from "@/components/whats-on-page";
import { localizedMetadata } from "@/lib/metadata";
import { isMonthSegment, monthFrom } from "@/lib/whats-on";

interface PartProps {
  readonly params: Promise<{ locale: Locale; part: string; slug: string }>;
}

export const generateMetadata = async ({
  params,
}: PartProps): Promise<Metadata> => {
  const { locale, part, slug } = await params;
  if (isMonthSegment(slug) && part === "society") {
    const t = await getTranslations({ locale, namespace: "web.events" });
    return localizedMetadata(locale, `/events/${slug}/society`, {
      description: t("lede"),
      title: t("title"),
    });
  }
  const series = await loadSeries(slug);
  if (series && (part === "past" || part === "shelf")) {
    const t = await getTranslations({ locale, namespace: "web.programs.page" });
    return localizedMetadata(locale, `/events/${slug}/${part}`, {
      description: localized(series, "summary", locale),
      title:
        part === "past"
          ? t("pastTitle", { program: localized(series, "name", locale) })
          : t("shelf"),
    });
  }
  const occasion = series ? events.occasionOf(series.slug, part) : undefined;
  if (occasion) {
    const t = await getTranslations({
      locale,
      namespace: `web.programs.occasions.${occasion}`,
    });
    return localizedMetadata(locale, `/events/${slug}/${part}`, {
      description: t("lede"),
      title: t("title"),
    });
  }
  return series && isMonthSegment(part) ? seriesMetadata(locale, series) : {};
};

/**
 * A month of What's on with the Society's dates alone
 * (/events/2026-11/society), or a month of one program
 * (/events/salon/2026-11), or an occasion's page
 * (/events/book-circle/mutanabbi-street, /events/open-pages/worst-poem).
 */
const PartPage = async ({ params }: PartProps) => {
  const { locale, part, slug } = await params;
  setRequestLocale(locale);
  if (isMonthSegment(slug) && part === "society") {
    return (
      <WhatsOn locale={locale} month={monthFrom(slug)} withUniversity={false} />
    );
  }
  const series = await loadSeries(slug);
  if (series && part === "past") {
    return <ProgramPast locale={locale} series={series} />;
  }
  if (series?.slug === "book-circle" && part === "shelf") {
    return <BookCircleShelfList locale={locale} series={series} />;
  }
  const occasion = series ? events.occasionOf(series.slug, part) : undefined;
  if (series && occasion) {
    // The trip's page shows only once Student Life's approval is on record.
    if (!(await occasionVisible(occasion))) {
      notFound();
    }
    return <OccasionPage locale={locale} occasion={occasion} series={series} />;
  }
  if (!(series && isMonthSegment(part))) {
    notFound();
  }
  return <SeriesView locale={locale} month={part} series={series} />;
};

export default PartPage;
