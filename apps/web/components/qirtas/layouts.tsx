import type { Locale } from "@repo/internationalization";
import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import {
  journal,
  localized,
  sanitizeRichText,
  splitAtFigures,
  type TextPart,
  withContents,
  withNotes,
} from "@repo/sal-data";
import { getTranslations } from "next-intl/server";
import { mediaUrl } from "@/lib/media";
import { FigureChart } from "./figure-chart";

type Full = NonNullable<Awaited<ReturnType<typeof journal.qirtasPiece>>>;

/** The texts to show: the language it was written in, both if bilingual. */
export const texts = (piece: Full) =>
  [
    { html: piece.body?.body_en, lang: "en" as const },
    { html: piece.body?.body_ar, lang: "ar" as const },
  ].filter((text): text is { html: string; lang: "en" | "ar" } =>
    Boolean(text.html)
  );

type PieceFigureData = Full["figures"][number];

/**
 * One figure (the design review A16): its title, the bars or the table, and
 * its source; the values written in the page's language.
 */
const PieceFigure = async ({
  figure,
  lang,
}: {
  figure: PieceFigureData;
  lang: "en" | "ar";
}) => {
  const t = await getTranslations("web.journal.figures");
  const title = localized(figure, "title", lang) || figure.title_en || "";
  const source = localized(figure, "source", lang);
  return (
    <figure className="not-prose my-10 grid gap-4 border-line border-y py-6">
      <figcaption className="type-label">{title}</figcaption>
      <FigureChart
        asBars={t("asBars")}
        asTable={t("asTable")}
        rows={figure.rows.map((row) => ({
          label:
            localized(row, "label", lang) || row.label_en || row.label_ar || "",
          shown: formatNumber(row.value, lang),
          value: row.value,
        }))}
        title={title}
        unit={localized(figure, "unit", lang)}
        valueHeader={t("value")}
      />
      {source ? (
        <p className="type-caption text-text-secondary">
          {t("source", { source })}
        </p>
      ) : null}
    </figure>
  );
};

/** Figures the text does not place, for after it. */
export const unplacedFigures = (piece: Full) => {
  const placed = new Set(
    texts(piece).flatMap((text) =>
      splitAtFigures(sanitizeRichText(text.html)).flatMap((part) =>
        "figure" in part ? [part.figure] : []
      )
    )
  );
  return piece.figures.filter((f) => !placed.has(f.sort));
};

/** A text with its figures drawn where it names them. */
const TextBody = ({
  className,
  figures,
  html,
  lang,
}: {
  className: string;
  figures: readonly PieceFigureData[];
  html: string;
  lang: "en" | "ar";
}) => {
  const parts =
    figures.length > 0 ? splitAtFigures(html) : [{ html } as TextPart];
  // Each part is keyed by where it starts in the text.
  let at = 0;
  const keyed = parts.map((part) => {
    const key = "figure" in part ? `f${part.figure}-${at}` : `t${at}`;
    at += "figure" in part ? 1 : part.html.length;
    return { key, part };
  });
  return (
    <>
      {keyed.map(({ key, part }) => {
        if ("figure" in part) {
          const figure = figures.find((f) => f.sort === part.figure);
          return figure ? (
            <PieceFigure figure={figure} key={key} lang={lang} />
          ) : null;
        }
        return (
          <div
            className={className}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized with the one rich-text policy
            dangerouslySetInnerHTML={{ __html: part.html }}
            key={key}
          />
        );
      })}
    </>
  );
};

/** The figures the text left unplaced, after it. */
const FiguresAfter = ({ piece }: { piece: Full }) => {
  const rest = unplacedFigures(piece);
  const [first] = texts(piece);
  const lang = first?.lang ?? "en";
  return rest.length > 0 ? (
    <div dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
      {rest.map((figure) => (
        <PieceFigure figure={figure} key={figure.id} lang={lang} />
      ))}
    </div>
  ) : null;
};

/**
 * A text, sanitized, with its notes numbered and listed after it (design
 * review A13: a note is written in place, in <small>; a pull quote is an
 * <aside>, set by `prose` in the design system).
 */
const Html = async ({
  className,
  contents = false,
  figures = [],
  html,
  lang,
}: {
  className: string;
  /** A long read: anchors on its headings, for the contents (A15). */
  contents?: boolean;
  /** An explainer's figures, drawn where the text names them (A16). */
  figures?: readonly PieceFigureData[];
  html: string;
  lang: "en" | "ar";
}) => {
  const { body: noted, notes } = withNotes(sanitizeRichText(html), lang);
  const body = contents ? withContents(noted, lang).body : noted;
  const dir = lang === "ar" ? "rtl" : "ltr";
  if (notes.length === 0) {
    return (
      <div dir={dir} lang={lang}>
        <TextBody
          className={className}
          figures={figures}
          html={body}
          lang={lang}
        />
      </div>
    );
  }
  const t = await getTranslations("web.journal.reading");
  return (
    <div className="grid gap-8" dir={dir} lang={lang}>
      <TextBody
        className={className}
        figures={figures}
        html={body}
        lang={lang}
      />
      <ol
        aria-label={t("notes")}
        className="type-caption grid gap-2 border-line border-t pt-4 font-sans"
      >
        {notes.map((note, index) => (
          <li className="flex gap-2" id={note.id} key={note.id}>
            <a className="link shrink-0" href={`#${note.ref}`}>
              {`${index + 1}.`}
            </a>
            <span
              // biome-ignore lint/security/noDangerouslySetInnerHtml: part of the sanitized text above
              dangerouslySetInnerHTML={{ __html: note.html }}
            />
          </li>
        ))}
      </ol>
    </div>
  );
};

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

/**
 * News, interviews, features, reviews: a column after the photo, in the
 * site's own type (owner, Oct 24, 2026: news reads like the rest of the
 * site; Literata stays for stories and poems).
 */
const NewsBody = ({ locale, piece }: { locale: Locale; piece: Full }) => {
  const [photo] = images(piece);
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6 px-4">
      {photo ? <Figure image={photo} locale={locale} /> : null}
      {texts(piece).map((text) => (
        <Html
          className="prose max-w-none"
          figures={piece.figures}
          html={text.html}
          key={text.lang}
          lang={text.lang}
        />
      ))}
      <FiguresAfter piece={piece} />
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

const PROSE_AR =
  "prose max-w-none [&_blockquote]:border-0 [&_blockquote]:p-0 [&_blockquote]:font-sans [&_blockquote]:text-3xl [&_blockquote]:not-italic";
const PROSE_EN =
  "prose max-w-none [&>p:first-of-type]:first-letter:float-start [&>p:first-of-type]:first-letter:pe-2 [&>p:first-of-type]:first-letter:font-medium [&>p:first-of-type]:first-letter:text-6xl [&>p:first-of-type]:first-letter:text-accent [&>p:first-of-type]:first-letter:leading-none [&_blockquote]:border-0 [&_blockquote]:p-0 [&_blockquote]:font-light [&_blockquote]:font-sans [&_blockquote]:text-3xl [&_blockquote]:not-italic [&_blockquote]:leading-tight [&_blockquote]:tracking-tight";

/** A long read: ten minutes or more, in three parts or more (A15). */
const LONG_READ_MINUTES = 10;
const LONG_READ_PARTS = 3;

const contentsOf = (piece: Full) =>
  texts(piece).map((text) => ({
    contents: withContents(sanitizeRichText(text.html), text.lang).contents,
    lang: text.lang,
  }));

const isLongRead = (piece: Full) =>
  journal.readingMinutes(
    texts(piece)
      .map((x) => x.html)
      .join(" ")
  ) >= LONG_READ_MINUTES &&
  contentsOf(piece).some((x) => x.contents.length >= LONG_READ_PARTS);

/**
 * A long read (the design review A15): the text in its reading column and,
 * beside it on a wide screen, its parts, kept in view as the reader goes;
 * above it on a narrow one. Each part's heading is an anchor.
 */
const LongReadBody = async ({ piece }: { piece: Full }) => {
  const t = await getTranslations("web.journal.reading");
  const parts = contentsOf(piece).filter(
    (x) => x.contents.length >= LONG_READ_PARTS
  );
  return (
    <div className="reading mx-auto grid w-full max-w-5xl gap-10 px-4 py-12 lg:grid-cols-[14rem_minmax(0,42rem)] lg:gap-16">
      <nav
        aria-label={t("contents")}
        className="font-sans lg:sticky lg:top-24 lg:self-start print:hidden"
      >
        {parts.map((part) => (
          <div className="grid gap-3" key={part.lang} lang={part.lang}>
            <p className="type-label">{t("contents")}</p>
            <ol className="grid gap-2 border-line border-s ps-4">
              {part.contents.map((item) => (
                <li className="type-caption" key={item.id}>
                  <a className="hover:text-accent" href={`#${item.id}`}>
                    {item.text}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </nav>
      <div className="grid gap-10 [&_h2]:scroll-mt-24">
        {texts(piece).map((text) => (
          <Html
            className={text.lang === "ar" ? PROSE_AR : PROSE_EN}
            contents
            html={text.html}
            key={text.lang}
            lang={text.lang}
          />
        ))}
      </div>
    </div>
  );
};

/** A story, essay, column or translation: a reading column with a drop cap (English only:
 * Arabic letters join, so a raised first letter would break the word). */
const ProseBody = ({ piece }: { piece: Full }) =>
  isLongRead(piece) ? (
    <LongReadBody piece={piece} />
  ) : (
    <div className="reading mx-auto grid w-full max-w-2xl gap-10 px-4 py-12">
      {texts(piece).map((text) => (
        <Html
          className={text.lang === "ar" ? PROSE_AR : PROSE_EN}
          html={text.html}
          key={text.lang}
          lang={text.lang}
        />
      ))}
    </div>
  );

/**
 * A translation beside its original (the design review A24, decision D11:
 * an exception to one language per page). Side by side on a wide screen,
 * the original after the translation on a narrow one; the original keeps
 * its own language and direction.
 */
const TranslationBody = async ({
  locale,
  piece,
}: {
  locale: Locale;
  piece: Full;
}) => {
  const original = piece.body?.original;
  const lang = piece.body?.original_lang;
  if (!(original && lang)) {
    return <ProseBody piece={piece} />;
  }
  const t = await getTranslations("web.journal.reading");
  const name =
    new Intl.DisplayNames([locale], { type: "language" }).of(lang) ?? lang;
  return (
    <div className="reading mx-auto grid w-full max-w-6xl gap-12 px-4 py-12 lg:grid-cols-2">
      <section
        aria-label={t("translation")}
        className="grid content-start gap-10"
      >
        {texts(piece).map((text) => (
          <Html
            className={text.lang === "ar" ? PROSE_AR : PROSE_EN}
            html={text.html}
            key={text.lang}
            lang={text.lang}
          />
        ))}
      </section>
      <section
        aria-label={t("original", { language: name })}
        className="grid content-start gap-4 border-line border-t pt-6 lg:border-s lg:border-t-0 lg:ps-12 lg:pt-0"
      >
        <p className="type-caption text-text-secondary">
          {t("original", { language: name })}
        </p>
        <div
          className="prose max-w-none"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized with the one rich-text policy
          dangerouslySetInnerHTML={{ __html: sanitizeRichText(original) }}
          dir={journal.textDirection(lang)}
          lang={lang}
        />
      </section>
    </div>
  );
};

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

/**
 * A photo essay (design review A14): the essay's words first, in the
 * reading column, then the photographs in sequence, each the full width of
 * the page with its caption and its place in the sequence beneath.
 */
const PhotoEssayBody = async ({
  locale,
  piece,
}: {
  locale: Locale;
  piece: Full;
}) => {
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const all = images(piece);
  return (
    <div className="grid gap-16">
      <div className="reading mx-auto grid w-full max-w-2xl gap-6 px-4 py-12">
        {texts(piece).map((text) => (
          <Html
            className="prose max-w-none"
            html={text.html}
            key={text.lang}
            lang={text.lang}
          />
        ))}
      </div>
      <ol className="grid gap-16">
        {all.map((image, index) => {
          const caption = localized(
            {
              caption_ar: image.caption_ar ?? "",
              caption_en: image.caption_en ?? "",
            },
            "caption",
            locale
          );
          return (
            <li key={image.storage_path}>
              <figure className="grid gap-3">
                {/* biome-ignore lint/performance/noImgElement: a published image from the media bucket */}
                <img
                  alt={localized(image, "alt", locale)}
                  className="w-full"
                  height={image.height ?? 900}
                  loading={index === 0 ? "eager" : "lazy"}
                  src={image.url}
                  width={image.width ?? 1200}
                />
                <figcaption className="mx-auto grid w-full max-w-2xl gap-1 px-4">
                  <span className="type-caption text-text-secondary">
                    {t("photoOf", {
                      n: String(index + 1),
                      total: String(all.length),
                    })}
                  </span>
                  {caption ? (
                    <span className="type-body">{caption}</span>
                  ) : null}
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

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
        className="grid min-h-56 place-items-center border-line border-y py-10 text-center"
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
    case "drama":
      return <DramaBody piece={piece} />;
    case "translation":
      return <TranslationBody locale={locale} piece={piece} />;
    case "six_words":
      return <SixWordsBody piece={piece} />;
    case "photo_essay":
      return <PhotoEssayBody locale={locale} piece={piece} />;
    case "comic":
    case "illustration":
      return <ComicBody locale={locale} piece={piece} />;
    default:
      break;
  }
  switch (journal.deskOf(piece.category as journal.Category)) {
    case "gallery":
      return <GalleryBody locale={locale} piece={piece} />;
    case "video":
      return <VideoBody locale={locale} piece={piece} />;
    case "news":
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
      <h2 className="type-heading">{t("corrections")}</h2>
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
