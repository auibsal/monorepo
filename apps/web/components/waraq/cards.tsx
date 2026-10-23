import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { type journal, localized } from "@repo/sal-data";
import { getTranslations } from "next-intl/server";
import { mediaUrl } from "@/lib/media";

type Card = journal.PieceCard;

export const pieceHref = (piece: { slug: string }) =>
  `/waraq/pieces/${piece.slug}`;

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
        href={`/waraq/authors/${piece.contributor.slug}`}
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
            className="aspect-[4/3] w-full rounded-card object-cover"
            height={picture.height ?? 900}
            loading="lazy"
            src={picture.url}
            width={picture.width ?? 1200}
          />
        </Link>
      ) : null}
      <p className="type-kicker">
        {t(`categories.${piece.category}`)}
        {piece.members_only ? ` · ${t("membersOnly")}` : ""}
      </p>
      <h3
        className={large ? "type-display" : "type-subheading"}
        dir="auto"
        lang={lang}
      >
        <Link
          className="underline-offset-4 hover:underline"
          href={pieceHref(piece)}
        >
          {localized(piece, "title", locale)}
        </Link>
      </h3>
      {deck ? (
        <p
          className={large ? "type-lede" : "type-body text-text-secondary"}
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
  <ul className="grid gap-4">
    {pieces.map((piece) => (
      <li className="border-rule border-b pb-4" key={piece.id}>
        <PieceCardView locale={locale} piece={piece} />
      </li>
    ))}
  </ul>
);
