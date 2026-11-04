import { isLocale } from "@repo/internationalization";
import { getTranslations } from "next-intl/server";
import { qirtasFeed } from "@/lib/feed";

/** Qirtas's RSS feed, the whole paper (design review A6). */
export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ locale: string }> }
) => {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return new Response(null, { status: 404 });
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return qirtasFeed({
    description: t("tagline"),
    desk: null,
    locale,
    path: "/qirtas/feed.xml",
    title: t("title"),
  });
};
