import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isHost, WhatsOn } from "@/components/whats-on-page";
import { localizedMetadata } from "@/lib/metadata";
import { roughlyNow } from "@/lib/this-year";
import { monthFrom } from "@/lib/whats-on";

// Its query string decides what it shows, so it renders per request.
export const instant = false;

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
  const now = new Date(await roughlyNow());
  const { locale } = await params;
  const { host, month } = await searchParams;
  setRequestLocale(locale);
  return (
    <WhatsOn
      host={isHost(host) ? host : undefined}
      locale={locale}
      month={monthFrom(month, now)}
    />
  );
};

export default EventsPage;
