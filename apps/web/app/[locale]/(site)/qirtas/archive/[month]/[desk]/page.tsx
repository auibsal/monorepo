import type { Locale } from "@repo/internationalization";
import { formatMonth } from "@repo/internationalization/format";
import { journal } from "@repo/sal-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArchiveMonth } from "@/components/qirtas/archive";
import { localizedMetadata } from "@/lib/metadata";
import { isMonthSegment, monthFrom } from "@/lib/whats-on";

interface MonthDeskProps {
  readonly params: Promise<{ desk: string; locale: Locale; month: string }>;
}

const isDesk = (value: string): value is journal.Desk =>
  (journal.desks as readonly string[]).includes(value);

export const generateMetadata = async ({
  params,
}: MonthDeskProps): Promise<Metadata> => {
  const { desk, locale, month } = await params;
  if (!(isMonthSegment(month) && isDesk(desk))) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const title = formatMonth(monthFrom(month).from, locale);
  return localizedMetadata(locale, `/qirtas/archive/${month}/${desk}`, {
    description: t(`deskLedes.${desk}`),
    title: `${t(`desks.${desk}`)} · ${title} · ${t("title")}`,
  });
};

/** One section's month in Qirtas (design review A20). */
const MonthDeskPage = async ({ params }: MonthDeskProps) => {
  const { desk, locale, month } = await params;
  setRequestLocale(locale);
  if (!(isMonthSegment(month) && isDesk(desk))) {
    notFound();
  }
  return <ArchiveMonth desk={desk} locale={locale} month={monthFrom(month)} />;
};

export default MonthDeskPage;
