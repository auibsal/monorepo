import type { Locale } from "@repo/internationalization";
import { localizedPath } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ManageLinks } from "@/components/manage-links";
import {
  Byline,
  leadImage,
  PieceColumn,
  pieceHref,
} from "@/components/qirtas/cards";
import { PairedClip, Reading } from "@/components/qirtas/clip-and-reading";
import { SelectionToggle } from "@/components/qirtas/gallery-selection";
import { CorrectionNotes, PieceBody, texts } from "@/components/qirtas/layouts";
import { PieceEnd } from "@/components/qirtas/piece-end";
import { ReadingProgress } from "@/components/qirtas/reading-tools";
import { ShareLink } from "@/components/share";
import { journal, localized } from "@/lib/data";
import { articleLd, JsonLd } from "@/lib/json-ld";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/u;
type Piece = Awaited<ReturnType<typeof journal.qirtasPiece>>;

/**
 * A published piece by its slug, or null. One language per page: a piece
 * shows only on the site in its own language (an English piece is never
 * served under /ar, nor an Arabic one without it); bilingual pieces on both.
 */
export const loadPiece = async (
  slug: string,
  locale: Locale
): Promise<Piece> => {
  if (!SLUG.test(slug)) {
    return null;
  }
  const piece = await readPublished(
    ["journal"],
    (c) => journal.qirtasPiece(c, slug),
    null
  );
  return piece && journal.inLanguage([piece], locale).length > 0 ? piece : null;
};

export const pieceMetadata = async (
  locale: Locale,
  slug: string
): Promise<Metadata> => {
  const piece = await loadPiece(slug, locale);
  if (!piece) {
    return {};
  }
  return localizedMetadata(locale, pieceHref(piece), {
    description:
      localized(piece, "deck", locale) ||
      (piece.contributor ? localized(piece.contributor, "name", locale) : ""),
    image: leadImage(piece)?.url ?? undefined,
    languages: piece.language === "bilingual" ? undefined : [locale],
    title: localized(piece, "title", locale),
  });
};

/**
 * A published piece (/qirtas/<section>/<slug>): the masthead, the title and
 * its facts, the text, corrections, an ad for visitors, and more from the
 * section.
 */
export const PieceArticle = async ({
  locale,
  piece,
}: {
  locale: Locale;
  piece: NonNullable<Piece>;
}) => {
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const desk = piece.desk as journal.Desk;
  const category = piece.category as journal.Category;
  const deck = localized(piece, "deck", locale);
  const words = texts(piece).reduce(
    (sum, text) => sum + journal.wordCount(text.html),
    0
  );
  const proseTypes: journal.Category[] = [
    ...journal.sectionTypes.news,
    ...journal.sectionTypes.voices,
    "fiction",
    "creative_nonfiction",
    "translation",
  ];
  const section = journal.inLanguage(
    await readPublished(
      ["journal"],
      (c) => journal.deskPieces(c, desk, { limit: 24 }),
      []
    ),
    locale
  );
  // The next piece (design review C15): the one published before this in
  // its section, or the section's newest once this is the oldest.
  const at = section.findIndex((p) => p.id === piece.id);
  const following = section[at + 1] ?? (at > 0 ? section[0] : undefined);
  const next = following && following.id !== piece.id ? following : null;
  const related = section
    .filter((p) => p.id !== piece.id && p.id !== next?.id)
    .slice(0, 3);
  const issue = piece.issue as {
    slug: string;
    title_ar: string;
    title_en: string;
  } | null;
  const lockedText = piece.members_only && texts(piece).length === 0;
  // The event the piece came from (design review C16), when it is public.
  const [event] = await readPublished(
    ["journal", "events"],
    async (c) => {
      const found = await journal.pieceEvent(c, piece.event_id);
      return found ? [found] : [];
    },
    []
  );

  return (
    <div className="grid w-full gap-10 py-10">
      <ReadingProgress />
      <article className="grid gap-8">
        <JsonLd
          data={articleLd(locale, {
            anonymous: piece.contributor?.is_anonymous,
            author: piece.contributor
              ? localized(piece.contributor, "name", locale)
              : null,
            image: leadImage(piece)?.url,
            modifiedAt: piece.updated_at,
            news: piece.desk === "news",
            path: pieceHref(piece),
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
          <h1 className="type-display text-balance">
            {localized(piece, "title", locale)}
          </h1>
          <ManageLinks diwan={`/qirtas/pieces/${piece.slug}`} />
          <ShareLink title={localized(piece, "title", locale)} />
          {desk === "gallery" && !piece.members_only ? (
            <SelectionToggle slug={piece.slug} />
          ) : null}
          <p className="type-caption">
            <Link
              className="text-accent hover:underline"
              href={`/qirtas/${desk}`}
            >
              {t(`desks.${desk}`)}
            </Link>
            {` · ${t(`categories.${category}`)}`}
            {event ? (
              <>
                {" · "}
                <Link
                  className="hover:underline"
                  href={`/events/${event.slug}`}
                >
                  {localized(event, "title", locale)}
                </Link>
              </>
            ) : null}
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
          {deck ? (
            <p className="type-lede text-text-secondary max-w-[44ch]">{deck}</p>
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
          <TopicsLine
            label={t("topics")}
            locale={locale}
            topics={piece.topics}
          />
          {/* Never on a members-only piece: the database refuses it. */}
          <Reading locale={locale} path={piece.reading_path} />
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
          <div className="border-line mx-auto grid w-full max-w-3xl gap-3 border-t px-4 pt-6">
            <p className="type-body">{t("membersOnlyBody")}</p>
            <a
              className="bg-accent text-on-accent hover:bg-accent/90 inline-flex h-12 items-center justify-self-start px-6 text-[0.9375rem] font-medium"
              href={localizedPath(locale, `/qirtas/read/${piece.slug}`)}
            >
              {t("readInDiwan")}
            </a>
          </div>
        ) : (
          <PieceBody locale={locale} piece={piece} />
        )}
        <IdentityLine locale={locale} piece={piece} />
        <PairedClip clipId={piece.clip_id} locale={locale} />
        <CorrectionNotes locale={locale} piece={piece} />
        {desk === "news" ? (
          <TrustNote
            category={t(`categories.${category}`)}
            checked={Boolean(piece.checked_at)}
            locale={locale}
          />
        ) : null}
        <p className="type-caption mx-auto w-full max-w-3xl px-4">
          {t("firstPublished")}
        </p>
      </article>
      <ReadOn issue={issue} locale={locale} next={next} />
      {related.length > 0 ? (
        <aside
          aria-label={t("moreFrom", { desk: t(`desks.${desk}`) })}
          className="mx-auto grid w-full max-w-3xl gap-4 px-4 print:hidden"
        >
          <h2 className="type-heading" id="related">
            {t("moreFrom", { desk: t(`desks.${desk}`) })}
          </h2>
          <PieceColumn locale={locale} pieces={related} />
        </aside>
      ) : null}
      <PieceEnd desk={desk} locale={locale} />
    </div>
  );
};

/**
 * The Trust Project's indicators on a News piece (decisions.md, Frameworks
 * followed: Publishing): the type of work, how it was checked, the
 * standards behind it, where to report an error, and who owns Qirtas.
 * The byline and its corrections sit above it.
 */
const TrustNote = async ({
  category,
  checked,
  locale,
}: {
  category: string;
  checked: boolean;
  locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.journal.trust" });
  return (
    <aside
      aria-labelledby="about-this-piece"
      className="border-line mx-auto grid w-full max-w-3xl gap-2 border-t px-4 pt-6 print:hidden"
    >
      <h2 className="type-label" id="about-this-piece">
        {t("title")}
      </h2>
      <p className="type-body">
        {`${t("type", { type: category })} ${t("news")}`}
        {checked ? ` ${t("checked")}` : ""}
      </p>
      <p className="type-caption flex flex-wrap gap-x-5 gap-y-1">
        <Link className="link" href="/library/editorial-standards">
          {t("standards")}
        </Link>
        <Link className="link" href="/about/contact">
          {t("correct")}
        </Link>
        <Link className="link" href="/qirtas/transparency">
          {t("transparency")}
        </Link>
      </p>
    </aside>
  );
};

/**
 * The op-ed's identity line under its text (decisions.md, Qirtas), in the
 * page's language (one language per page) and in the writer's own Arabic
 * form: "[Name] is a junior studying business at AUIB."
 */
const IdentityLine = async ({
  locale,
  piece,
}: {
  locale: Locale;
  piece: NonNullable<Piece>;
}) => {
  // Only under an op-ed's text, and not where the text is for members only.
  if (
    piece.category !== "opinion_essay" ||
    (piece.members_only && texts(piece).length === 0)
  ) {
    return null;
  }
  const identity = await readPublished(
    ["journal"],
    (c) => journal.opEdIdentity(c, piece.id),
    null
  );
  if (!(identity && piece.contributor)) {
    return null;
  }
  const t = await getTranslations({
    locale,
    namespace: "diwan.journal.write.voices.identity",
  });
  const line = journal.identityLine(t, {
    feminine: identity.feminine,
    line: identity.about_writer ?? "",
    name: localized(piece.contributor, "name", locale),
    student: identity.student,
    year: identity.writer_year ?? "",
  });
  return line ? (
    <p className="type-body mx-auto w-full max-w-3xl px-4">{line}</p>
  ) : null;
};

/** After the article: the next piece in its section, and its Edition (C15). */
const ReadOn = async ({
  issue,
  locale,
  next,
}: {
  issue: { slug: string; title_ar: string; title_en: string } | null;
  locale: Locale;
  next: journal.PieceCard | null;
}) => {
  if (!(next || issue)) {
    return null;
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return (
    <nav
      aria-label={t("reading.after")}
      className="border-text mx-auto grid w-full max-w-3xl gap-4 border-t px-4 pt-6 sm:grid-cols-2 print:hidden"
    >
      {next ? (
        <Link className="group grid gap-1" href={pieceHref(next)}>
          <span className="type-caption">{t("reading.next")}</span>
          <span className="type-title group-hover:text-accent">
            {localized(next, "title", locale)}
          </span>
        </Link>
      ) : null}
      {issue ? (
        <Link
          className="group grid gap-1"
          href={`/qirtas/editions/${issue.slug}`}
        >
          <span className="type-caption">{t("reading.inEdition")}</span>
          <span className="type-title group-hover:text-accent">
            {localized(issue, "title", locale)}
          </span>
        </Link>
      ) : null}
    </nav>
  );
};

/** The piece's topics, each opening its page (the design review A21). */
const TopicsLine = ({
  label,
  locale,
  topics,
}: {
  label: string;
  locale: Locale;
  topics: readonly { name_ar: string; name_en: string; slug: string }[];
}) =>
  topics.length > 0 ? (
    <p className="type-caption">
      {`${label}: `}
      {topics.map((topic, i) => (
        <span key={topic.slug}>
          {i > 0 ? " · " : ""}
          <Link
            className="hover:underline"
            href={`/qirtas/topics/${topic.slug}`}
          >
            {localized(topic, "name", locale)}
          </Link>
        </span>
      ))}
    </p>
  ) : null;
