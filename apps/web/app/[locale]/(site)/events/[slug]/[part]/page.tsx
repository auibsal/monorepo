import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SecondChapterGive } from "@/components/second-chapter-give";
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
  const series = isMonthSegment(part) ? await loadSeries(slug) : null;
  return series ? seriesMetadata(locale, series) : {};
};

/**
 * A month of What's on with the Society's dates alone
 * (/events/2026-11/society), or a month of one program
 * (/events/salon/2026-11).
 */
const PartPage = async ({ params }: PartProps) => {
  const { locale, part, slug } = await params;
  setRequestLocale(locale);
  if (isMonthSegment(slug) && part === "society") {
    return (
      <WhatsOn locale={locale} month={monthFrom(slug)} withUniversity={false} />
    );
  }
  const series = isMonthSegment(part) ? await loadSeries(slug) : null;
  if (!series) {
    notFound();
  }
  return (
    <SeriesView locale={locale} month={part} series={series}>
      {series.slug === "second-chapter" ? (
        <SecondChapterGive locale={locale} />
      ) : null}
    </SeriesView>
  );
};

export default PartPage;
