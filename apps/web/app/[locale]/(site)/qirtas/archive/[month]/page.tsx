import type { Locale } from "@repo/internationalization";
import { formatMonth } from "@repo/internationalization/format";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArchiveMonth } from "@/components/waraq/archive";
import { localizedMetadata } from "@/lib/metadata";
import { isMonthSegment, monthFrom } from "@/lib/whats-on";

interface MonthProps {
  readonly params: Promise<{ locale: Locale; month: string }>;
}

export const generateMetadata = async ({
  params,
}: MonthProps): Promise<Metadata> => {
  const { locale, month } = await params;
  if (!isMonthSegment(month)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const title = formatMonth(monthFrom(month).from, locale);
  return localizedMetadata(locale, `/qirtas/archive/${month}`, {
    description: t("archive.lede"),
    title: `${title} · ${t("title")}`,
  });
};

/** A month of Qirtas, every section (design review A20). */
const MonthPage = async ({ params }: MonthProps) => {
  const { locale, month } = await params;
  setRequestLocale(locale);
  if (!isMonthSegment(month)) {
    notFound();
  }
  return <ArchiveMonth desk={null} locale={locale} month={monthFrom(month)} />;
};

export default MonthPage;
