import { buttonVariants } from "@repo/brand/components/ui/button";
import type { Locale } from "@repo/internationalization";
import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { journal, localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ManageLinks } from "@/components/manage-links";
import { ShareLink } from "@/components/share";
import { pieceHref } from "@/components/waraq/cards";
import { EditionCover, loadEditions } from "@/components/waraq/editions";
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
  return localizedMetadata(locale, `/qirtas/editions/${edition.slug}`, {
    description: localized(edition, "theme", locale),
    image: mediaUrl(edition.cover_path) ?? undefined,
    title: localized(edition, "title", locale),
  });
};

/**
 * An Edition as a book (design review C12): the cover (the scan, or the
 * typographic cover), its print line, the editor's letter, a contents page
 * by section, and the Editions before and after it. Its launch page is
 * /qirtas/editions/<slug>/launch.
 */
const EditionPage = async ({ params }: EditionProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const edition = await load(slug);
  if (!edition) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const pieces = journal.inLanguage(
    await readPublished(
      ["journal"],
      (c) => journal.editionPieces(c, edition.id),
      []
    ),
    locale
  );
  const shelf = await loadEditions();
  const at = shelf.findIndex((e) => e.id === edition.id);
  const older = at >= 0 ? shelf[at + 1] : undefined;
  const newer = at > 0 ? shelf[at - 1] : undefined;
  const pdf = mediaUrl(edition.pdf_path);
  const letter = localized(edition, "editors_note", locale);
  // The printed edition (owner, Oct 29, 2026), once its record is complete.
  const printer = localized(edition, "printer", locale);
  const printed =
    printer && edition.printed_on && edition.print_run
      ? t("printed", {
          copies: formatNumber(edition.print_run, locale),
          date: formatLongDate(edition.printed_on, locale),
          printer,
        })
      : null;
  const byDesk = journal.desks
    .map((desk) => ({ desk, pieces: pieces.filter((p) => p.desk === desk) }))
    .filter((group) => group.pieces.length > 0);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-10">
      <header className="grid gap-8 md:grid-cols-[1fr_2fr]">
        <div className="w-full max-w-sm">
          <EditionCover edition={edition} locale={locale} />
        </div>
        <div className="grid content-start gap-3">
          <h1 className="type-display">
            {localized(edition, "title", locale)}
          </h1>
          <p className="type-caption">
            {localized(edition, "season", locale) || t("edition")}
          </p>
          <ManageLinks diwan={`/qirtas/editions/${edition.slug}`} />
          <ShareLink title={localized(edition, "title", locale)} />
          {localized(edition, "theme", locale) ? (
            <p className="type-lede">{localized(edition, "theme", locale)}</p>
          ) : null}
          {printed ? <p className="type-caption">{printed}</p> : null}
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
          <h2 className="type-heading" id="letter">
            {t("editorsNote")}
          </h2>
          <p className="whitespace-pre-wrap">{letter}</p>
        </section>
      ) : null}
      <section
        aria-labelledby="contents"
        className="mx-auto grid w-full max-w-3xl gap-10"
      >
        <h2 className="type-heading" id="contents">
          {t("contents")}
        </h2>
        {byDesk.map((group) => (
          <div className="grid gap-3" key={group.desk}>
            <h3 className="type-label">{t(`desks.${group.desk}`)}</h3>
            <ol className="grid border-line border-b">
              {group.pieces.map((piece) => (
                <li className="border-line border-t" key={piece.id}>
                  <Link
                    className="group grid gap-x-6 gap-y-1 py-3 sm:grid-cols-[1fr_auto] sm:items-baseline"
                    href={pieceHref(piece)}
                  >
                    <span className="type-subheading group-hover:text-accent">
                      {localized(piece, "title", locale)}
                    </span>
                    {piece.contributor ? (
                      <span className="type-caption text-text-secondary">
                        {localized(piece.contributor, "name", locale)}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        ))}
        <p className="type-body">
          <Link
            className="link"
            href={`/qirtas/editions/${edition.slug}/launch`}
          >
            {t("launchPage")}
          </Link>
        </p>
      </section>
      {older || newer ? (
        <nav
          aria-label={t("otherEditions")}
          className="mx-auto grid w-full max-w-3xl gap-4 border-text border-t pt-6 sm:grid-cols-2"
        >
          {older ? (
            <Link
              className="group grid gap-1"
              href={`/qirtas/editions/${older.slug}`}
            >
              <span className="type-caption">{t("previousEdition")}</span>
              <span className="type-title group-hover:text-accent">
                {localized(older, "title", locale)}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {newer ? (
            <Link
              className="group grid gap-1 sm:text-end"
              href={`/qirtas/editions/${newer.slug}`}
            >
              <span className="type-caption">{t("nextEdition")}</span>
              <span className="type-title group-hover:text-accent">
                {localized(newer, "title", locale)}
              </span>
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
};

export default EditionPage;
