import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isHost, WhatsOn } from "@/components/whats-on-page";
import { localizedMetadata } from "@/lib/metadata";
import { monthFrom } from "@/lib/whats-on";

interface EventsProps {
  readonly params: Promise<{ locale: Locale }>;
  readonly searchParams: Promise<{ host?: string; month?: string }>;
}

export const generateMetadata = async ({
  params,
}: EventsProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.events" });
  return localizedMetadata(locale, "/events", {
    description: t("lede"),
    title: t("title"),
  });
};

/**
 * What's on, this month; another month and a host are query strings
 * (/events?month=2026-11&host=company, decisions §6).
 */
const EventsPage = async ({ params, searchParams }: EventsProps) => {
  const { locale } = await params;
  const { host, month } = await searchParams;
  setRequestLocale(locale);
  return (
    <WhatsOn
      host={isHost(host) ? host : undefined}
      locale={locale}
      month={monthFrom(month)}
    />
  );
};

export default EventsPage;
