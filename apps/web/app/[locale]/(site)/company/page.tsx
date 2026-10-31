import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { CompanyView } from "@/components/company-view";
import { loadProgramme, seriesMetadata } from "@/components/series";

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
