import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CompanyView } from "@/components/company-view";
import { loadProgramme, seriesMetadata } from "@/components/series";
import { isMonthSegment } from "@/lib/whats-on";

interface CompanyMonthProps {
  readonly params: Promise<{ locale: Locale; month: string }>;
}

export const generateMetadata = async ({
  params,
}: CompanyMonthProps): Promise<Metadata> => {
  const { locale, month } = await params;
  if (!isMonthSegment(month)) {
    return {};
  }
  const company = await loadProgramme("company");
  return company ? seriesMetadata(locale, company) : {};
};

/**
 * A month of the Company's dates. Its performances are ordinary events
 * (owner, Nov 7, 2026): there are no playbill or production pages.
 */
const CompanyMonthPage = async ({ params }: CompanyMonthProps) => {
  const { locale, month } = await params;
  setRequestLocale(locale);
  if (!isMonthSegment(month)) {
    notFound();
  }
  return <CompanyView locale={locale} month={month} />;
};

export default CompanyMonthPage;
