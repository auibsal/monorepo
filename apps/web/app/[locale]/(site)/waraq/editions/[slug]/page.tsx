import { buttonVariants } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { journal, localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PieceCardView } from "@/components/waraq/cards";
import { Nameplate } from "@/components/waraq/nameplate";
import { mediaUrl } from "@/lib/media";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface EditionProps {
  readonly params: Promise<{ locale: Locale; slug: string }>;
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
type Edition = Awaited<ReturnType<typeof journal.issueBySlug>>;

export const generateStaticParams = () => [];

const load = (slug: string): Promise<Edition | null> =>
  SLUG.test(slug)
    ? readPublished(["journal"], (c) => journal.issueBySlug(c, slug), null)
    : Promise.resolve(null);

export const generateMetadata = async ({
  params,
}: EditionProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  const edition = await load(slug);
  if (!edition) {
    return {};
  }
  return localizedMetadata(locale, `/waraq/editions/${edition.slug}`, {
    description: localized(edition, "theme", locale),
    image: mediaUrl(edition.cover_path) ?? undefined,
    title: localized(edition, "title", locale),
  });
};

/** An Edition: its cover, the editor's letter and the contents. */
const EditionPage = async ({ params }: EditionProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const edition = await load(slug);
  if (!edition) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const pieces = await readPublished(
    ["journal"],
    (c) => journal.editionPieces(c, edition.id),
    []
  );
  const cover = mediaUrl(edition.cover_path);
  const pdf = mediaUrl(edition.pdf_path);
  const letter = localized(edition, "editors_note", locale);
  const byDesk = journal.desks
    .map((desk) => ({ desk, pieces: pieces.filter((p) => p.desk === desk) }))
    .filter((group) => group.pieces.length > 0);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-10">
      <Nameplate locale={locale} small />
      <header className="grid gap-8 md:grid-cols-[1fr_2fr]">
        {cover ? (
          // biome-ignore lint/performance/noImgElement: a published image from the media bucket
          <img
            alt={t("coverAlt")}
            className="w-full"
            height={800}
            src={cover}
            width={600}
          />
        ) : null}
        <div className="grid content-start gap-3">
          <p className="type-kicker">
            {localized(edition, "season", locale) || t("edition")}
          </p>
          <h1 className="type-display">
            {localized(edition, "title", locale)}
          </h1>
          {localized(edition, "theme", locale) ? (
            <p className="type-lede">{localized(edition, "theme", locale)}</p>
          ) : null}
          {pdf ? (
            <a
              className={buttonVariants({
                className: "justify-self-start",
                variant: "outline",
              })}
              href={pdf}
            >
              {t("pdf")}
            </a>
          ) : null}
        </div>
      </header>
      {letter ? (
        <section
          aria-labelledby="letter"
          className="reading mx-auto grid w-full max-w-2xl gap-3 p-8"
        >
          <h2 className="type-kicker" id="letter">
            {t("editorsNote")}
          </h2>
          <p className="whitespace-pre-wrap">{letter}</p>
        </section>
      ) : null}
      <section aria-labelledby="contents" className="grid gap-8">
        <h2 className="type-kicker border-line border-b pb-2" id="contents">
          {t("inThisIssue")}
        </h2>
        {byDesk.map((group) => (
          <div className="grid gap-4" key={group.desk}>
            <h3 className="type-heading">{t(`desks.${group.desk}`)}</h3>
            <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {group.pieces.map((piece) => (
                <li key={piece.id}>
                  <PieceCardView
                    image={group.desk === "gallery"}
                    locale={locale}
                    piece={piece}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
};

export default EditionPage;
