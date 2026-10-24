import type { Locale } from "@repo/internationalization";
import { localizedPath, nexusPath } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { journal, localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { WaraqAd } from "@/components/waraq/ad";
import {
  Byline,
  leadImage,
  PieceColumn,
  pieceHref,
} from "@/components/waraq/cards";
import { CorrectionNotes, PieceBody, texts } from "@/components/waraq/layouts";
import { Nameplate } from "@/components/waraq/nameplate";
import { articleLd, JsonLd } from "@/lib/json-ld";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface PieceProps {
  readonly params: Promise<{ locale: Locale; slug: string }>;
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
type Piece = Awaited<ReturnType<typeof journal.waraqPiece>>;

export const generateStaticParams = () => [];

const load = (slug: string): Promise<Piece> =>
  SLUG.test(slug)
    ? readPublished(["journal"], (c) => journal.waraqPiece(c, slug), null)
    : Promise.resolve(null);

export const generateMetadata = async ({
  params,
}: PieceProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  const piece = await load(slug);
  if (!piece) {
    return {};
  }
  return localizedMetadata(locale, `/qirtas/pieces/${piece.slug}`, {
    description:
      localized(piece, "deck", locale) ||
      (piece.contributor ? localized(piece.contributor, "name", locale) : ""),
    image: leadImage(piece)?.url ?? undefined,
    title: localized(piece, "title", locale),
  });
};

const PiecePage = async ({ params }: PieceProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const piece = await load(slug);
  if (!piece) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const desk = piece.desk as journal.Desk;
  const category = piece.category as journal.Category;
  const deck = localized(piece, "deck", locale);
  const credit = localized(piece, "credit", locale);
  const words = texts(piece).reduce(
    (sum, text) => sum + journal.wordCount(text.html),
    0
  );
  const proseTypes: journal.Category[] = [
    "article",
    "interview",
    "review",
    "feature",
    "fiction",
    "creative_nonfiction",
    "column",
    "letter",
    "translation",
  ];
  const related = (
    await readPublished(
      ["journal"],
      (c) => journal.deskPieces(c, desk, { limit: 4 }),
      []
    )
  )
    .filter((p) => p.id !== piece.id)
    .slice(0, 3);
  const issue = piece.issue as {
    slug: string;
    title_ar: string;
    title_en: string;
  } | null;
  const lockedText = piece.members_only && texts(piece).length === 0;

  return (
    <div className="grid w-full gap-10 py-10">
      <div className="mx-auto w-full max-w-6xl px-4">
        <Nameplate current={desk} locale={locale} small />
      </div>
      <article className="grid gap-8">
        <JsonLd
          data={articleLd(locale, {
            author: piece.contributor
              ? localized(piece.contributor, "name", locale)
              : null,
            image: leadImage(piece)?.url,
            path: `/qirtas/pieces/${piece.slug}`,
            publishedAt: piece.published_at,
            title: localized(piece, "title", locale),
          })}
        />
        <header
          className={
            category === "poetry" || category === "six_words"
              ? "mx-auto grid w-full max-w-2xl justify-items-center gap-3 px-4 text-center"
              : "mx-auto grid w-full max-w-3xl gap-3 px-4"
          }
        >
          <p className="type-kicker">
            <Link className="hover:underline" href={`/qirtas/${desk}`}>
              {t(`desks.${desk}`)}
            </Link>
            {` · ${t(`categories.${category}`)}`}
            {issue ? (
              <>
                {" · "}
                <Link
                  className="hover:underline"
                  href={`/qirtas/editions/${issue.slug}`}
                >
                  {localized(issue, "title", locale)}
                </Link>
              </>
            ) : null}
          </p>
          <h1 className="type-display text-balance">
            {localized(piece, "title", locale)}
          </h1>
          {deck ? (
            <p className="type-lede max-w-[44ch] text-text-secondary">{deck}</p>
          ) : null}
          <Byline locale={locale} piece={piece} />
          {piece.credits.length > 0 ? (
            <p className="type-caption">
              {piece.credits
                .map(
                  (c) =>
                    `${t(`roles.${c.role as "reporter"}`)}: ${
                      c.contributor
                        ? localized(c.contributor, "name", locale)
                        : ""
                    }`
                )
                .join(" · ")}
            </p>
          ) : null}
          {credit ? <p className="type-caption">{credit}</p> : null}
          {proseTypes.includes(category) && words > 0 ? (
            <p className="type-caption">
              {t("readingTime", {
                minutes: formatNumber(
                  journal.readingMinutes(
                    texts(piece)
                      .map((x) => x.html)
                      .join(" ")
                  ),
                  locale
                ),
              })}
            </p>
          ) : null}
        </header>
        {lockedText ? (
          <div className="mx-auto grid w-full max-w-3xl gap-3 border border-line border-t p-6">
            <p className="type-body">{t("membersOnlyBody")}</p>
            <a
              className="inline-flex h-10 items-center justify-self-start rounded-md bg-primary px-4 text-primary-foreground text-sm"
              href={`${localizedPath(locale, nexusPath("/qirtas/piece"))}?slug=${piece.slug}`}
            >
              {t("readInNexus")}
            </a>
          </div>
        ) : (
          <PieceBody locale={locale} piece={piece} />
        )}
        <CorrectionNotes locale={locale} piece={piece} />
        <p className="type-caption mx-auto w-full max-w-3xl px-4">
          {t("firstPublished")}
        </p>
      </article>
      <div className="mx-auto w-full max-w-3xl px-4">
        <WaraqAd locale={locale} page={pieceHref(piece)} slot={0} />
      </div>
      {related.length > 0 ? (
        <aside
          aria-labelledby="related"
          className="mx-auto grid w-full max-w-3xl gap-4 px-4"
        >
          <h2 className="type-kicker border-line border-b pb-2" id="related">
            {t("moreFrom", { desk: t(`desks.${desk}`) })}
          </h2>
          <PieceColumn locale={locale} pieces={related} />
        </aside>
      ) : null}
    </div>
  );
};

export default PiecePage;
