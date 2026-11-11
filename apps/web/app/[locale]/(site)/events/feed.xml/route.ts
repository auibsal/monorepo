import { isLocale } from "@repo/internationalization";
import { getTranslations } from "next-intl/server";
import { eventsFeed } from "@/lib/feed";

/** What's on's RSS feed (decisions.md, Standards). */
export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ locale: string }> }
) => {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return new Response(null, { status: 404 });
  }
  const t = await getTranslations({ locale, namespace: "web.events" });
  return eventsFeed({ description: t("lede"), locale, title: t("title") });
};
