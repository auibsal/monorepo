import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Productions } from "@/components/productions";
import { loadSeries, SeriesView, seriesMetadata } from "@/components/series";

interface CompanyProps {
  readonly params: Promise<{ locale: Locale }>;
  readonly searchParams: Promise<{ month?: string }>;
}

export const generateMetadata = async ({
  params,
}: CompanyProps): Promise<Metadata> => {
  const { locale } = await params;
  const series = await loadSeries("company");
  return series ? seriesMetadata(locale, series) : {};
};

/** The Company as a series: its dates, then its productions. */
const CompanyPage = async ({ params, searchParams }: CompanyProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  // Read the month first: it makes the page render on request, so a build
  // that can't find the program never leaves a cached "not found".
  const { month } = await searchParams;
  const series = await loadSeries("company");
  if (!series) {
    notFound();
  }
  return (
    <SeriesView locale={locale} month={month} series={series}>
      <Productions locale={locale} />
    </SeriesView>
  );
};

export default CompanyPage;
