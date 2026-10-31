import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { WhatsOn } from "@/components/whats-on-page";
import { localizedMetadata } from "@/lib/metadata";
import { monthFrom } from "@/lib/whats-on";

interface EventsProps {
  readonly params: Promise<{ locale: Locale }>;
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

/** What's on, this month (other months at /events/<YYYY-MM>). */
const EventsPage = async ({ params }: EventsProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  return <WhatsOn locale={locale} month={monthFrom(undefined)} />;
};

export default EventsPage;
