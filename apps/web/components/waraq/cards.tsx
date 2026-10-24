import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { type journal, localized } from "@repo/sal-data";
import { getTranslations } from "next-intl/server";
import { mediaUrl } from "@/lib/media";

type Card = journal.PieceCard;

export const pieceHref = (piece: { slug: string }) =>
  `/qirtas/pieces/${piece.slug}`;

/** The first image of a piece (gallery, photo essay, comic, news photo). */
export const leadImage = (piece: Card) => {
  const [first] = [...(piece.media ?? [])].sort((a, b) => a.sort - b.sort);
  if (first) {
    return { ...first, url: mediaUrl(first.storage_path) };
  }
  const legacy = mediaUrl(piece.image_path);
  return legacy
    ? {
        alt_ar: "",
        alt_en: "",
        height: null,
        storage_path: piece.image_path ?? "",
        url: legacy,
        width: null,
      }
    : null;
};

/** Byline: the contributor (a pen name stays a pen name) and the date. */
export const Byline = ({
  locale,
  piece,
  showDate = true,
}: {
  locale: Locale;
  piece: Card;
  showDate?: boolean;
}) => (
  <p className="type-caption">
    {piece.contributor ? (
      <Link
        className="underline-offset-4 hover:underline"
        href={`/qirtas/authors/${piece.contributor.slug}`}
      >
        {localized(piece.contributor, "name", locale)}
      </Link>
    ) : null}
    {showDate && piece.published_at
      ? `${piece.contributor ? " · " : ""}${formatLongDate(piece.published_at, locale)}`
      : ""}
  </p>
);

/** One piece in a list: type, headline, deck, byline, and an image if any. */
export const PieceCardView = async ({
  image = false,
  large = false,
  locale,
  piece,
}: {
  image?: boolean;
  large?: boolean;
  locale: Locale;
  piece: Card;
}) => {
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const picture = image ? leadImage(piece) : null;
  const deck = localized(piece, "deck", locale);
  // Headlines keep their own language and direction on either page.
  const lang = piece.language === "ar" ? "ar" : "en";
  return (
    <article className="grid content-start gap-2">
      {picture?.url ? (
        <Link href={pieceHref(piece)}>
          {/* biome-ignore lint/performance/noImgElement: a published image from the media bucket */}
          <img
            alt={localized(picture, "alt", locale)}
            className="aspect-[4/3] w-full object-cover"
            height={picture.height ?? 900}
            loading="lazy"
            src={picture.url}
            width={picture.width ?? 1200}
          />
        </Link>
      ) : null}
      <p className="type-label text-accent!">
        {t(`categories.${piece.category}`)}
        {piece.members_only ? ` · ${t("membersOnly")}` : ""}
      </p>
      <h3
        className={
          large ? "type-title text-balance font-light!" : "type-heading"
        }
        dir="auto"
        lang={lang}
      >
        <Link className="hover:text-accent" href={pieceHref(piece)}>
          {localized(piece, "title", locale)}
        </Link>
      </h3>
      {deck ? (
        <p
          className={
            large
              ? "type-lede max-w-[40ch] text-text-secondary"
              : "type-caption text-text-secondary"
          }
          dir="auto"
          lang={lang}
        >
          {deck}
        </p>
      ) : null}
      <Byline locale={locale} piece={piece} />
    </article>
  );
};

/** A column of headlines, rule between them. */
export const PieceColumn = async ({
  locale,
  pieces,
}: {
  locale: Locale;
  pieces: readonly Card[];
}) => (
  <ul className="grid content-start divide-y divide-line">
    {pieces.map((piece) => (
      <li className="py-space-4 first:pt-0" key={piece.id}>
        <PieceCardView locale={locale} piece={piece} />
      </li>
    ))}
  </ul>
);

/**
 * The lead story (v6): the category, a Light headline, the deck in Literata
 * and the byline. The picture shows only when the piece has one: a story
 * without an image keeps a typographic layout, never an empty box.
 */
export const LeadStory = async ({
  locale,
  piece,
}: {
  locale: Locale;
  piece: Card;
}) => {
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const picture = leadImage(piece);
  const deck = localized(piece, "deck", locale);
  const lang = piece.language === "ar" ? "ar" : "en";
  return (
    <article className="grid content-start gap-4">
      <p className="type-label text-accent!">
        {t(`categories.${piece.category}`)}
        {piece.members_only ? ` · ${t("membersOnly")}` : ""}
      </p>
      <h2 className="type-display text-balance" dir="auto" lang={lang}>
        <Link className="hover:text-accent" href={pieceHref(piece)}>
          {localized(piece, "title", locale)}
        </Link>
      </h2>
      {deck ? (
        <p
          className="type-lede max-w-[44ch] text-text-secondary"
          dir="auto"
          lang={lang}
        >
          {deck}
        </p>
      ) : null}
      <Byline locale={locale} piece={piece} />
      {picture?.url ? (
        <Link className="mt-2" href={pieceHref(piece)}>
          {/* biome-ignore lint/performance/noImgElement: a published image from the media bucket */}
          <img
            alt={localized(picture, "alt", locale)}
            className="aspect-[3/2] w-full object-cover"
            height={picture.height ?? 800}
            src={picture.url}
            width={picture.width ?? 1200}
          />
        </Link>
      ) : null}
    </article>
  );
};
