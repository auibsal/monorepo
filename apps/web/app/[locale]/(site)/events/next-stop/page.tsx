import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { loadSeries, SeriesView, seriesMetadata } from "@/components/series";

interface NextStopProps {
  readonly params: Promise<{ locale: Locale }>;
  readonly searchParams: Promise<{ month?: string }>;
}

export const generateMetadata = async ({
  params,
}: NextStopProps): Promise<Metadata> => {
  const { locale } = await params;
  const series = await loadSeries("next-stop");
  return series ? seriesMetadata(locale, series) : {};
};

/** Next Stop as a series, with the way to its promise to the people it films. */
const NextStopPage = async ({ params, searchParams }: NextStopProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  // Read the month first: it makes the page render on request, so a build
  // that can't find the program never leaves a cached "not found".
  const { month } = await searchParams;
  const series = await loadSeries("next-stop");
  if (!series) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.programmes" });
  return (
    <SeriesView locale={locale} month={month} series={series}>
      <p>
        <Link className="link" href="/events/next-stop/care">
          {t("care")}
        </Link>
      </p>
    </SeriesView>
  );
};

export default NextStopPage;
