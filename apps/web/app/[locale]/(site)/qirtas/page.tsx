import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { journal, localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NewsletterSignup } from "@/components/newsletter/signup";
import {
  LeadStory,
  leadImage,
  PieceCardView,
  PieceColumn,
  pieceHref,
} from "@/components/qirtas/cards";
import { mediaUrl } from "@/lib/media";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface QirtasProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: QirtasProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return localizedMetadata(locale, "/qirtas", {
    description: t("lede"),
    feed: "/qirtas/feed.xml",
    title: t("title"),
  });
};

const heading = "type-label text-text! border-text border-b pb-2";

/** Latest news: a column beside Letters, or a full row of cards alone. */
const News = async ({
  alone,
  locale,
  pieces,
}: {
  alone: boolean;
  locale: Locale;
  pieces: readonly journal.PieceCard[];
}) => {
  const t = await getTranslations({ locale, namespace: "web.journal" });
  if (pieces.length === 0) {
    return null;
  }
  return (
    <section
      aria-labelledby="news"
      className={
        alone
          ? "grid content-start gap-4 md:col-span-3"
          : "grid content-start gap-4"
      }
    >
      <h2 className={heading} id="news">
        <Link href="/qirtas/news">{t("desks.news")}</Link>
      </h2>
      {alone ? (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {pieces.map((piece) => (
            <PieceCardView key={piece.id} locale={locale} piece={piece} />
          ))}
        </div>
      ) : (
        <PieceColumn locale={locale} pieces={pieces} />
      )}
    </section>
  );
};

const QirtasFrontPage = async ({ params }: QirtasProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const read = <T,>(
    fn: (c: Parameters<typeof journal.frontPieces>[0]) => Promise<T>,
    fallback: T
  ) =>
    readPublished(["journal"], fn, fallback).then(
      (rows) =>
        (Array.isArray(rows) ? journal.inLanguage(rows, locale) : rows) as T
    );
  const [front, news, letters, gallery, video, voices, edition, games] =
    await Promise.all([
      read((c) => journal.frontPieces(c), []),
      read((c) => journal.deskPieces(c, "news", { limit: 6 }), []),
      read(
        (c) =>
          journal.deskPieces(c, "letters", {
            categories: journal
              .deskCategories("letters")
              .filter((x) => x !== "six_words"),
            limit: 4,
          }),
        []
      ),
      read((c) => journal.deskPieces(c, "gallery", { limit: 6 }), []),
      read((c) => journal.deskPieces(c, "video", { limit: 2 }), []),
      read((c) => journal.deskPieces(c, "voices", { limit: 3 }), []),
      read((c) => journal.currentEdition(c), null),
      read((c) => journal.deskPieces(c, "games", { limit: 2 }), []),
    ]);
  // The Editor's front_rank decides the top. With nothing set as front,
  // the newest work from all six sections leads (design review C13), so
  // the page has a top rather than a gap.
  const newest = [
    ...new Map(
      [...news, ...voices, ...letters, ...gallery, ...video, ...games].map(
        (p) => [p.id, p]
      )
    ).values(),
  ].sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));
  const top = front.length > 0 ? front : newest.slice(0, 5);
  const [lead, ...ranked] = top;
  const onFront = new Set(top.slice(0, 5).map((p) => p.id));
  const latestNews = news.filter((p) => !onFront.has(p.id));
  const nothing =
    front.length + news.length + letters.length + gallery.length === 0;
  const cover = mediaUrl(edition?.cover_path);

  return (
    <>
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-10">
        <h1 className="sr-only">{t("title")}</h1>

        {nothing ? (
          <p className="type-lede text-center">{t("firstEdition")}</p>
        ) : null}

        {lead ? (
          <section
            aria-label={t("lead")}
            className="grid gap-x-14 gap-y-10 md:grid-cols-[1.7fr_1fr]"
          >
            <LeadStory locale={locale} piece={lead} />
            {ranked.length > 0 ? (
              <PieceColumn locale={locale} pieces={ranked.slice(0, 4)} />
            ) : null}
          </section>
        ) : null}

        <div className="grid gap-12 md:grid-cols-3">
          <News
            alone={letters.length === 0}
            locale={locale}
            pieces={latestNews}
          />
          {letters.length > 0 ? (
            <section
              aria-labelledby="letters"
              className="grid content-start gap-4 md:col-span-2"
            >
              <h2 className={heading} id="letters">
                <Link href="/qirtas/letters">{t("desks.letters")}</Link>
              </h2>
              <div className="grid gap-8 sm:grid-cols-2">
                {letters.map((piece) => (
                  <PieceCardView key={piece.id} locale={locale} piece={piece} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {gallery.length > 0 ? (
          <section aria-labelledby="gallery" className="grid gap-4">
            <h2 className={heading} id="gallery">
              <Link href="/qirtas/gallery">{t("desks.gallery")}</Link>
            </h2>
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {gallery.map((piece) => {
                const image = leadImage(piece);
                return (
                  <li key={piece.id}>
                    <Link className="grid gap-2" href={pieceHref(piece)}>
                      {image?.url ? (
                        // biome-ignore lint/performance/noImgElement: a published image from the media bucket
                        <img
                          alt={localized(image, "alt", locale)}
                          className="aspect-square w-full object-cover"
                          height={image.height ?? 800}
                          loading="lazy"
                          src={image.url}
                          width={image.width ?? 800}
                        />
                      ) : null}
                      <span
                        className="type-subheading"
                        dir="auto"
                        lang={piece.language === "ar" ? "ar" : "en"}
                      >
                        {localized(piece, "title", locale)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <div className="grid gap-12 md:grid-cols-3">
          {voices.length > 0 ? (
            <section
              aria-labelledby="voices"
              className="grid content-start gap-4"
            >
              <h2 className={heading} id="voices">
                <Link href="/qirtas/voices">{t("desks.voices")}</Link>
              </h2>
              <PieceColumn locale={locale} pieces={voices} />
            </section>
          ) : null}
          {video.length > 0 ? (
            <section
              aria-labelledby="video"
              className="grid content-start gap-4"
            >
              <h2 className={heading} id="video">
                <Link href="/qirtas/video">{t("desks.video")}</Link>
              </h2>
              <PieceColumn locale={locale} pieces={video} />
            </section>
          ) : null}
        </div>

        {edition ? (
          <section
            aria-labelledby="edition"
            className="grid gap-6 border-line border-t pt-space-4 md:grid-cols-[1fr_2fr]"
          >
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
            <div className="grid content-start gap-2">
              <h2 className="type-heading" id="edition">
                {t("currentEdition")}
              </h2>
              <Link
                className="type-title hover:text-accent"
                href={`/qirtas/editions/${edition.slug}`}
              >
                {localized(edition, "title", locale)}
              </Link>
              {localized(edition, "theme", locale) ? (
                <p className="type-lede">
                  {localized(edition, "theme", locale)}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <section
          aria-labelledby="newsletter"
          className="grid gap-4 border-line border-t pt-space-4 md:grid-cols-[1fr_1.4fr] md:items-start"
        >
          <div className="grid gap-2">
            <h2 className="type-heading" id="newsletter">
              {t("newsletter")}
            </h2>
            <p className="type-body">{t("newsletterLede")}</p>
          </div>
          <NewsletterSignup compact />
        </section>
      </div>
    </>
  );
};

export default QirtasFrontPage;
