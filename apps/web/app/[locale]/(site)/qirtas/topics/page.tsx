import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { journal, localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface TopicsProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: TopicsProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return localizedMetadata(locale, "/qirtas/topics", {
    description: t("topicsLede"),
    title: `${t("topics")} · ${t("title")}`,
  });
};

/** Every topic with published pieces (the design review A21). */
const TopicsPage = async ({ params }: TopicsProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const topics = (
    await readPublished(["journal"], (c) => journal.publicTopics(c), [])
  ).sort((a, b) =>
    localized(a, "name", locale).localeCompare(
      localized(b, "name", locale),
      locale
    )
  );
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-10">
      <header className="grid gap-2">
        <h1 className="type-display">{t("topics")}</h1>
        <p className="type-lede">{t("topicsLede")}</p>
      </header>
      {topics.length === 0 ? (
        <p className="type-body text-text-secondary">{t("noTopics")}</p>
      ) : (
        <ul className="border-line grid gap-x-10 border-b sm:grid-cols-2">
          {topics.map((topic) => (
            <li
              className="border-line flex items-baseline justify-between gap-4 border-t py-3"
              key={topic.id}
            >
              <Link className="link" href={`/qirtas/topics/${topic.slug}`}>
                {localized(topic, "name", locale)}
              </Link>
              <span className="type-caption text-text-secondary tabular-nums">
                {formatNumber(topic.count, locale)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TopicsPage;
