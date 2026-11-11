import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { content, localized } from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface FromTheSocietyProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: FromTheSocietyProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return localizedMetadata(locale, "/qirtas/from-the-society", {
    description: t("fromTheSocietyLede"),
    title: `${t("fromTheSociety")} · ${t("title")}`,
  });
};

/**
 * "From the Society" (decisions.md, Qirtas; Channels and email): every
 * notice the Society has sent or posted, dated, newest first, in the
 * page's language. Never bylined, never in News.
 */
const FromTheSocietyPage = async ({ params }: FromTheSocietyProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const notices = await readPublished(
    ["journal"],
    (c) => content.societyNotices(c, 200),
    []
  );
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-10">
      <header className="grid gap-2">
        <h1 className="type-display">{t("fromTheSociety")}</h1>
        <p className="type-lede">{t("fromTheSocietyLede")}</p>
      </header>
      {notices.length === 0 ? (
        <p className="type-body text-text-secondary">
          {t("fromTheSocietyEmpty")}
        </p>
      ) : (
        <ul className="border-line grid border-b">
          {notices.map((notice) => (
            <li
              className="border-line grid gap-1 border-t py-5"
              key={notice.id}
            >
              {notice.link_path ? (
                <Link
                  className="type-subheading hover:text-accent"
                  href={notice.link_path}
                >
                  {localized(notice, "title", locale)}
                </Link>
              ) : (
                <h2 className="type-subheading">
                  {localized(notice, "title", locale)}
                </h2>
              )}
              <p className="type-body">{localized(notice, "body", locale)}</p>
              {notice.shown_at ? (
                <p className="type-caption text-text-secondary">
                  {formatLongDate(notice.shown_at, locale, true)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FromTheSocietyPage;
