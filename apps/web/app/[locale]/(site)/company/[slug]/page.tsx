import type { Locale } from "@repo/internationalization";
import { localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CompanyView } from "@/components/company-view";
import { loadProduction, ProductionView } from "@/components/productions";
import { loadProgramme, seriesMetadata } from "@/components/series";
import { mediaUrl } from "@/lib/media";
import { localizedMetadata } from "@/lib/metadata";
import { isMonthSegment } from "@/lib/whats-on";

interface CompanyPartProps {
  readonly params: Promise<{ locale: Locale; slug: string }>;
}

export const generateMetadata = async ({
  params,
}: CompanyPartProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  if (isMonthSegment(slug)) {
    const company = await loadProgramme("company");
    return company ? seriesMetadata(locale, company) : {};
  }
  const production = await loadProduction(slug);
  if (!production) {
    return {};
  }
  const poster = mediaUrl(production.poster_path);
  return localizedMetadata(locale, `/company/${slug}`, {
    description: localized(production, "summary", locale),
    ...(poster ? { image: poster } : {}),
    title: localized(production, "title", locale),
  });
};

/** A production's own page, or a month of the Company's dates. */
const CompanyPartPage = async ({ params }: CompanyPartProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  if (isMonthSegment(slug)) {
    return <CompanyView locale={locale} month={slug} />;
  }
  const production = await loadProduction(slug);
  if (!production) {
    notFound();
  }
  return <ProductionView locale={locale} p={production} />;
};

export default CompanyPartPage;
