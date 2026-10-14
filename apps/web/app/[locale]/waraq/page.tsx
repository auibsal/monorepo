import { project } from "@repo/config";
import type { Locale } from "@repo/internationalization";
import { localizedPath } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { journal, localized, sanitizeRichText } from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  leadImage,
  PieceCardView,
  PieceColumn,
  pieceHref,
} from "@/components/waraq/cards";
import { Nameplate } from "@/components/waraq/nameplate";
import { mediaUrl } from "@/lib/media";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface WaraqProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: WaraqProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return localizedMetadata(locale, "/waraq", {
    description: t("lede"),
    title: t("title"),
  });
};

const heading = "type-kicker border-accent-line border-b pb-2";

/** Open and announced calls for the Edition (Letters and Gallery). */
const Calls = async ({ locale }: { locale: Locale }) => {
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const [open, upcoming] = await Promise.all([
    readPublished(["journal"], (c) => journal.openCalls(c), []),
    readPublished(["journal"], (c) => journal.upcomingCalls(c), []),
  ]);
  const calls = [...(open ?? []), ...(upcoming ?? [])];
  if (calls.length === 0) {
    return null;
  }
  return (
    <section
      aria-labelledby="calls"
      className="band grid gap-4 rounded-card p-6"
    >
      <h2 className="type-kicker text-on-band" id="calls">
        {t("calls")}
      </h2>
      {calls.map((call) => {
        const isOpen = new Date(call.opens_at) <= new Date();
        return (
          <div className="grid gap-2" key={call.id}>
            <h3 className="type-heading text-on-band">
              {localized(call, "title", locale)}
            </h3>
            <p className="text-on-band">
              {isOpen
                ? t("closes", { date: formatLongDate(call.closes_at, locale) })
                : t("opensCloses", {
                    closes: formatLongDate(call.closes_at, locale),
                    opens: formatLongDate(call.opens_at, locale),
                  })}
            </p>
            {isOpen ? (
              <a
                className="frame inline-flex h-10 items-center justify-self-start rounded-md bg-surface px-4 text-sm text-text"
                href={`${project.hosts.app}${localizedPath(locale, "/journal/submit")}?call=${call.id}`}
              >
                {t("submit")}
              </a>
            ) : null}
          </div>
        );
      })}
      <a
        className="justify-self-start text-on-band underline underline-offset-4"
        href={`${project.hosts.app}${localizedPath(locale, "/journal")}`}
      >
        {t("sendNews")}
      </a>
    </section>
  );
};

const WaraqFrontPage = async ({ params }: WaraqProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const read = <T,>(
    fn: (c: Parameters<typeof journal.frontPieces>[0]) => Promise<T>,
    fallback: T
  ) => readPublished(["journal"], fn, fallback);
  const [front, news, letters, gallery, sixWords, video, voices, edition] =
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
      read(
        (c) =>
          journal.deskPieces(c, "letters", {
            categories: ["six_words"],
            limit: 1,
          }),
        []
      ),
      read((c) => journal.deskPieces(c, "video", { limit: 2 }), []),
      read((c) => journal.deskPieces(c, "voices", { limit: 3 }), []),
      read((c) => journal.currentEdition(c), null),
    ]);
  const [lead, ...ranked] = front;
  const onFront = new Set(front.slice(0, 5).map((p) => p.id));
  const latestNews = news.filter((p) => !onFront.has(p.id));
  const sixWordsBody = sixWords[0]
    ? await readPublished(
        ["journal"],
        (c) => journal.waraqPiece(c, sixWords[0]?.slug ?? ""),
        null
      )
    : null;
  const nothing =
    front.length + news.length + letters.length + gallery.length === 0;
  const cover = mediaUrl(edition?.cover_path);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-10">
      <Nameplate locale={locale} />
      <h1 className="sr-only">{t("title")}</h1>

      {nothing ? (
        <p className="type-lede text-center">{t("firstEdition")}</p>
      ) : null}

      {lead ? (
        <section
          aria-label={t("lead")}
          className="grid gap-8 md:grid-cols-[2fr_1fr]"
        >
          <PieceCardView image large locale={locale} piece={lead} />
          {ranked.length > 0 ? (
            <PieceColumn locale={locale} pieces={ranked.slice(0, 4)} />
          ) : null}
        </section>
      ) : null}

      <div className="grid gap-12 md:grid-cols-3">
        {latestNews.length > 0 ? (
          <section aria-labelledby="news" className="grid content-start gap-4">
            <h2 className={heading} id="news">
              <Link href="/waraq/news">{t("desks.news")}</Link>
            </h2>
            <PieceColumn locale={locale} pieces={latestNews} />
          </section>
        ) : null}
        {letters.length > 0 ? (
          <section
            aria-labelledby="letters"
            className="reading grid content-start gap-4 rounded-card p-6 md:col-span-2"
          >
            <h2 className={heading} id="letters">
              <Link href="/waraq/letters">{t("desks.letters")}</Link>
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
            <Link href="/waraq/gallery">{t("desks.gallery")}</Link>
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
                        className="aspect-square w-full rounded-card object-cover"
                        height={image.height ?? 800}
                        loading="lazy"
                        src={image.url}
                        width={image.width ?? 800}
                      />
                    ) : null}
                    <span className="type-subheading">
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
        {sixWordsBody?.body ? (
          <section aria-labelledby="six" className="grid content-start gap-4">
            <h2 className={heading} id="six">
              {t("sixWordsOfTheWeek")}
            </h2>
            <Link
              className="frame reading grid min-h-40 place-items-center rounded-card p-6 text-center hover:underline"
              href={pieceHref(sixWordsBody)}
            >
              <span
                className="type-subheading font-mono"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized with the one rich-text policy
                dangerouslySetInnerHTML={{
                  __html: sanitizeRichText(
                    sixWordsBody.body.body_en ?? sixWordsBody.body.body_ar ?? ""
                  ),
                }}
              />
            </Link>
          </section>
        ) : null}
        {voices.length > 0 ? (
          <section
            aria-labelledby="voices"
            className="grid content-start gap-4"
          >
            <h2 className={heading} id="voices">
              <Link href="/waraq/voices">{t("desks.voices")}</Link>
            </h2>
            <PieceColumn locale={locale} pieces={voices} />
          </section>
        ) : null}
        {video.length > 0 ? (
          <section aria-labelledby="video" className="grid content-start gap-4">
            <h2 className={heading} id="video">
              <Link href="/waraq/video">{t("desks.video")}</Link>
            </h2>
            <PieceColumn locale={locale} pieces={video} />
          </section>
        ) : null}
      </div>

      {edition ? (
        <section
          aria-labelledby="edition"
          className="grid gap-4 rounded-card bg-surface-tint p-6 md:grid-cols-[1fr_2fr]"
        >
          {cover ? (
            // biome-ignore lint/performance/noImgElement: a published image from the media bucket
            <img
              alt={t("coverAlt")}
              className="w-full rounded-card"
              height={800}
              src={cover}
              width={600}
            />
          ) : null}
          <div className="grid content-start gap-2">
            <h2 className="type-kicker" id="edition">
              {t("currentEdition")}
            </h2>
            <Link
              className="type-heading hover:underline"
              href={`/waraq/editions/${edition.slug}`}
            >
              {localized(edition, "title", locale)}
            </Link>
            {localized(edition, "theme", locale) ? (
              <p className="type-lede">{localized(edition, "theme", locale)}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      <Calls locale={locale} />
    </div>
  );
};

export default WaraqFrontPage;
