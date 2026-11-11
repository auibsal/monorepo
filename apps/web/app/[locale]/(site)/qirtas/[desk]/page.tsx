import type { Locale } from "@repo/internationalization";
import { localizedPath } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PieceCardView } from "@/components/qirtas/cards";
import { SelectionBar } from "@/components/qirtas/gallery-selection";
import { journal } from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface DeskProps {
  readonly params: Promise<{ desk: string; locale: Locale }>;
}

// Games has a page of its own (/qirtas/games), with the daily games.
const isDesk = (value: string): value is journal.Desk =>
  value !== "games" && (journal.desks as readonly string[]).includes(value);

export const generateStaticParams = () =>
  journal.desks.filter((desk) => desk !== "games").map((desk) => ({ desk }));

export const generateMetadata = async ({
  params,
}: DeskProps): Promise<Metadata> => {
  const { desk, locale } = await params;
  if (!isDesk(desk)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return localizedMetadata(locale, `/qirtas/${desk}`, {
    description: t(`deskLedes.${desk}`),
    feed: `/qirtas/${desk}/feed.xml`,
    title: `${t(`desks.${desk}`)} · ${t("title")}`,
  });
};

/** A section of the paper: News, Voices, Letters, Gallery or Video. */
const DeskPage = async ({ params }: DeskProps) => {
  const { desk, locale } = await params;
  setRequestLocale(locale);
  if (!isDesk(desk)) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const pieces = journal.inLanguage(
    await readPublished(
      ["journal"],
      (c) => journal.deskPieces(c, desk, { limit: 48 }),
      []
    ),
    locale
  );
  const pictures = desk === "gallery" || desk === "video";

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10">
      <header className="grid gap-2">
        <h1 className="type-display">{t(`desks.${desk}`)}</h1>
        <p className="type-lede max-w-3xl">{t(`deskLedes.${desk}`)}</p>
        <p className="type-caption flex flex-wrap gap-x-5">
          <Link className="link" href="/qirtas/archive">
            {t("archive.open")}
          </Link>
          <a
            className="link"
            href={localizedPath(locale, `/qirtas/${desk}/feed.xml`)}
          >
            {t("feed")}
          </a>
          {journal.sendableCategories(desk).length > 0 ? (
            <Link className="link" href={`/qirtas/submit#${desk}`}>
              {t("sendTo", { desk: t(`desks.${desk}`) })}
            </Link>
          ) : null}
        </p>
        {desk === "gallery" ? <SelectionBar /> : null}
      </header>
      {pieces.length === 0 ? (
        <p className="type-body text-text-secondary">{t("noPieces")}</p>
      ) : (
        <ul
          className={
            desk === "letters"
              ? "reading grid gap-10 p-6 sm:grid-cols-2"
              : "grid gap-10 sm:grid-cols-2 lg:grid-cols-3"
          }
        >
          {pieces.map((piece) => (
            <li key={piece.id}>
              <PieceCardView
                heading="h2"
                image={pictures || desk === "news"}
                locale={locale}
                piece={piece}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DeskPage;
