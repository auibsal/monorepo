import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { journal, localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PieceCardView } from "@/components/waraq/cards";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface TopicProps {
  readonly params: Promise<{ locale: Locale; slug: string }>;
}

const load = (slug: string) =>
  readPublished(["journal"], (c) => journal.topicPage(c, slug), null);

export const generateMetadata = async ({
  params,
}: TopicProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  const found = await load(slug);
  if (!found) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const name = localized(found.topic, "name", locale);
  return localizedMetadata(locale, `/qirtas/topics/${slug}`, {
    description: t("topicLede", { topic: name }),
    title: `${name} · ${t("title")}`,
  });
};

/** A topic's page: its published pieces in the page's language, newest first. */
const TopicPage = async ({ params }: TopicProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const found = await load(slug);
  if (!found) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const pieces = journal.inLanguage(found.pieces, locale);
  const name = localized(found.topic, "name", locale);
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10">
      <header className="grid gap-3">
        <h1 className="type-display">{name}</h1>
        <p className="type-lede">{t("topicLede", { topic: name })}</p>
        <p className="type-caption">
          <Link className="link" href="/qirtas/topics">
            {t("allTopics")}
          </Link>
        </p>
      </header>
      {pieces.length === 0 ? (
        <p className="type-body text-text-secondary">{t("noPieces")}</p>
      ) : (
        <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {pieces.map((piece) => (
            <li key={piece.id}>
              <PieceCardView heading="h2" locale={locale} piece={piece} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TopicPage;
