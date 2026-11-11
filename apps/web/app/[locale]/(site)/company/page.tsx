import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { CompanyView } from "@/components/company-view";
import { loadProgramme, seriesMetadata } from "@/components/series";

// Made on its first visit (its productions and openings change), then kept
// until something is published again.
export const instant = false;

interface CompanyProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: CompanyProps): Promise<Metadata> => {
  const { locale } = await params;
  const company = await loadProgramme("company");
  return company ? seriesMetadata(locale, company) : {};
};

/** The Company: its productions, auditions, then this month's dates. */
const CompanyPage = async ({ params }: CompanyProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CompanyView locale={locale} />;
};

export default CompanyPage;
