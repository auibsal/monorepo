import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { journal, localized, sanitizeRichText } from "@repo/sal-data";
import { getTranslations } from "next-intl/server";
import { mediaUrl } from "@/lib/media";

type Full = NonNullable<Awaited<ReturnType<typeof journal.waraqPiece>>>;

/** The texts to show: the language it was written in, both if bilingual. */
export const texts = (piece: Full) =>
  [
    { html: piece.body?.body_en, lang: "en" as const },
    { html: piece.body?.body_ar, lang: "ar" as const },
  ].filter((text): text is { html: string; lang: "en" | "ar" } =>
    Boolean(text.html)
  );

const Html = ({
  className,
  html,
  lang,
}: {
  className: string;
  html: string;
  lang: "en" | "ar";
}) => (
  <div
    className={className}
    // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized with the one rich-text policy
    dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }}
    dir={lang === "ar" ? "rtl" : "ltr"}
    lang={lang}
  />
);

const images = (piece: Full) =>
  [...(piece.media ?? [])]
    .sort((a, b) => a.sort - b.sort)
    .map((m) => ({ ...m, url: mediaUrl(m.storage_path) ?? "" }))
    .filter((m) => m.url);

const Figure = ({
  full = false,
  image,
  locale,
  zoom = false,
}: {
  full?: boolean;
  image: ReturnType<typeof images>[number];
  locale: Locale;
  zoom?: boolean;
}) => {
  const caption = localized(
    {
      caption_ar: image.caption_ar ?? "",
      caption_en: image.caption_en ?? "",
    },
    "caption",
    locale
  );
  const img = (
    // biome-ignore lint/performance/noImgElement: a published image from the media bucket
    <img
      alt={localized(image, "alt", locale)}
      className={full ? "w-full" : "w-full"}
      height={image.height ?? 900}
      loading="lazy"
      src={image.url}
      width={image.width ?? 1200}
    />
  );
  return (
    <figure className="grid gap-2">
      {zoom ? (
        <a href={image.url} rel="noopener" target="_blank">
          {img}
        </a>
      ) : (
        img
      )}
      {caption ? (
        <figcaption className="type-caption px-4">{caption}</figcaption>
      ) : null}
    </figure>
  );
};

/** News, interviews, features, reviews: a reading column after the photo. */
const NewsBody = ({ locale, piece }: { locale: Locale; piece: Full }) => {
  const [photo] = images(piece);
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 px-4">
      {photo ? <Figure image={photo} locale={locale} /> : null}
      {texts(piece).map((text) => (
        <Html
          className="prose max-w-none"
          html={text.html}
          key={text.lang}
          lang={text.lang}
        />
      ))}
    </div>
  );
};

/** A poem: centered, line breaks exactly as written, generous space. */
const PoemBody = ({ piece }: { piece: Full }) => (
  <div className="reading mx-auto grid w-full max-w-2xl justify-items-center gap-12 px-4 py-12">
    {texts(piece).map((text) => (
      <Html
        className="prose max-w-none whitespace-pre-wrap [&_p]:mb-6"
        html={text.html}
        key={text.lang}
        lang={text.lang}
      />
    ))}
  </div>
);

/** A story, essay, column or translation: a reading column with a drop cap (English only:
 * Arabic letters join, so a raised first letter would break the word). */
const ProseBody = ({ piece }: { piece: Full }) => (
  <div className="reading mx-auto grid w-full max-w-2xl gap-10 px-4 py-12">
    {texts(piece).map((text) => (
      <Html
        className={
          text.lang === "ar"
            ? "prose max-w-none"
            : "prose max-w-none [&>p:first-of-type]:first-letter:float-start [&>p:first-of-type]:first-letter:pe-2 [&>p:first-of-type]:first-letter:font-bold [&>p:first-of-type]:first-letter:text-5xl [&>p:first-of-type]:first-letter:text-text [&>p:first-of-type]:first-letter:leading-none"
        }
        html={text.html}
        key={text.lang}
        lang={text.lang}
      />
    ))}
  </div>
);

/** A script: speakers and directions kept as set, a narrower column. */
const DramaBody = ({ piece }: { piece: Full }) => (
  <div className="reading mx-auto grid w-full max-w-2xl gap-10 px-4 py-12">
    {texts(piece).map((text) => (
      <Html
        className="prose max-w-none whitespace-pre-wrap [&_em]:text-text-secondary [&_p]:mb-4 [&_strong]:uppercase [&_strong]:tracking-wide"
        html={text.html}
        key={text.lang}
        lang={text.lang}
      />
    ))}
  </div>
);

/** Art, photography and photo essays: full width, captions, the statement. */
const GalleryBody = ({ locale, piece }: { locale: Locale; piece: Full }) => (
  <div className="grid gap-10">
    <div className="grid gap-10">
      {images(piece).map((image) => (
        <Figure full image={image} key={image.storage_path} locale={locale} />
      ))}
    </div>
    <div className="mx-auto grid w-full max-w-2xl gap-6 px-4">
      {texts(piece).map((text) => (
        <Html
          className="prose max-w-none"
          html={text.html}
          key={text.lang}
          lang={text.lang}
        />
      ))}
    </div>
  </div>
);

/** A comic: panels in sequence; tap a panel to see it full size. */
const ComicBody = ({ locale, piece }: { locale: Locale; piece: Full }) => (
  <div className="mx-auto grid w-full max-w-3xl gap-6 px-4">
    {images(piece).map((image) => (
      <Figure image={image} key={image.storage_path} locale={locale} zoom />
    ))}
    {texts(piece).map((text) => (
      <Html
        className="prose max-w-none"
        html={text.html}
        key={text.lang}
        lang={text.lang}
      />
    ))}
  </div>
);

/** Video: the player (YouTube, privacy-enhanced) and the summary. */
const VideoBody = async ({
  locale,
  piece,
}: {
  locale: Locale;
  piece: Full;
}) => {
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const id = journal.youtubeId(piece.video_url);
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 px-4">
      {id ? (
        <div className="aspect-video w-full overflow-hidden border-line border-t">
          <iframe
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            src={`https://www.youtube-nocookie.com/embed/${id}`}
            title={localized(piece, "title", locale)}
          />
        </div>
      ) : null}
      {piece.video_url && !id ? (
        <a
          className="justify-self-start underline underline-offset-4"
          href={piece.video_url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t("watch")}
        </a>
      ) : null}
      {texts(piece).map((text) => (
        <Html
          className="prose max-w-none"
          html={text.html}
          key={text.lang}
          lang={text.lang}
        />
      ))}
    </div>
  );
};

/** Six Words: a typewriter card. */
const SixWordsBody = ({ piece }: { piece: Full }) => (
  <div className="mx-auto grid w-full max-w-2xl gap-6 px-4">
    {texts(piece).map((text) => (
      <div
        className="reading grid min-h-56 place-items-center border border-line p-10 text-center"
        key={text.lang}
      >
        <Html
          className="type-heading font-mono [&_p]:mb-3"
          html={text.html}
          lang={text.lang}
        />
      </div>
    ))}
  </div>
);

/** The layout for the piece's type. Nobody lays anything out by hand. */
export const PieceBody = ({
  locale,
  piece,
}: {
  locale: Locale;
  piece: Full;
}) => {
  switch (piece.category as journal.Category) {
    case "poetry":
      return <PoemBody piece={piece} />;
    case "short_drama":
      return <DramaBody piece={piece} />;
    case "six_words":
      return <SixWordsBody piece={piece} />;
    case "art_photography":
    case "photo_essay":
      return <GalleryBody locale={locale} piece={piece} />;
    case "comic":
      return <ComicBody locale={locale} piece={piece} />;
    case "video":
      return <VideoBody locale={locale} piece={piece} />;
    case "article":
    case "interview":
    case "review":
    case "feature":
      return <NewsBody locale={locale} piece={piece} />;
    default:
      return <ProseBody piece={piece} />;
  }
};

/** Corrections, dated, at the end of the piece. */
export const CorrectionNotes = async ({
  locale,
  piece,
}: {
  locale: Locale;
  piece: Full;
}) => {
  if (piece.corrections.length === 0) {
    return null;
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return (
    <aside className="mx-auto grid w-full max-w-3xl gap-2 border-line border-t px-4 pt-4">
      <h2 className="type-kicker">{t("corrections")}</h2>
      <ul className="grid gap-1">
        {piece.corrections.map((c) => (
          <li className="type-caption" key={c.created_at}>
            {`${formatLongDate(c.created_at, locale)}: ${localized(
              {
                note_ar: c.note_ar ?? c.note_en ?? "",
                note_en: c.note_en ?? c.note_ar ?? "",
              },
              "note",
              locale
            )}`}
          </li>
        ))}
      </ul>
    </aside>
  );
};
