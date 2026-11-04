import { isLocale } from "@repo/internationalization";
import { journal } from "@repo/sal-data";
import { getTranslations } from "next-intl/server";
import { qirtasFeed } from "@/lib/feed";

const isDesk = (value: string): value is journal.Desk =>
  (journal.desks as readonly string[]).includes(value);

/** One section's RSS feed, /qirtas/<section>/feed.xml (design review A6). */
export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ desk: string; locale: string }> }
) => {
  const { desk, locale } = await params;
  if (!(isLocale(locale) && isDesk(desk))) {
    return new Response(null, { status: 404 });
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return qirtasFeed({
    description: t(`deskLedes.${desk}`),
    desk,
    locale,
    path: `/qirtas/${desk}/feed.xml`,
    title: `${t(`desks.${desk}`)} · ${t("title")}`,
  });
};
