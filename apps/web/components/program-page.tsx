import { Shelf } from "@repo/brand/components/sal/shelf";
import type { Locale } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { events, journal, localized, programmes } from "@repo/sal-data";
import { getTranslations } from "next-intl/server";
import { BookVote } from "@/components/book-vote";
import { SecondChapterGive } from "@/components/second-chapter-give";
import { Section } from "@/components/section";
import type { Series } from "@/components/series";
import { TypingToy } from "@/components/typing-toy";
import { readPublished } from "@/lib/supabase";

/**
 * One structure for every program's page (the design review C3, Nov 4,
 * 2026): what it is and its rhythm, the next session, its month, the
 * sessions past with what Qirtas wrote from them, then what is its own
 * (Second Chapter's collection, Book Circle's shelf, Open Pages' prompts).
 */

type Session = NonNullable<
  Awaited<ReturnType<typeof events.pastPublicEvents>>
>[number];

const programPath = (series: Series) => `/events/${series.slug}`;

/** The next public session, in one line, or nothing. */
export const NextSession = async ({
  locale,
  series,
}: {
  readonly locale: Locale;
  readonly series: Series;
}) => {
  const t = await getTranslations({ locale, namespace: "web.programs.page" });
  const [next] = await readPublished(
    ["events"],
    async (c) =>
      (await events.publicEvents(c, { limit: 1, programmeId: series.id })) ??
      [],
    []
  );
  if (!next) {
    return null;
  }
  return (
    <p className="type-lede">
      {t("next")}{" "}
      <Link className="link" href={`/events/${next.slug}`}>
        {t("nextLine", {
          date: formatLongDate(next.starts_at, locale),
          time: formatClock(next.starts_at, locale),
          title: localized(next, "title", locale),
        })}
      </Link>
    </p>
  );
};

/** Past sessions and the pieces Qirtas wrote from them. */
const loadPast = async (series: Series, limit: number) =>
  readPublished(
    ["events", "journal"],
    async (c) => {
      const sessions =
        (await events.pastPublicEvents(c, { limit, programmeId: series.id })) ??
        [];
      const ids = sessions.map((s) => s.id);
      const [pieces, links] = await Promise.all([
        journal.piecesFromEvents(c, ids),
        events.sessionLinks(c, ids),
      ]);
      return { links, pieces, sessions };
    },
    { links: [], pieces: [], sessions: [] }
  );

type SessionLink = Awaited<ReturnType<typeof events.sessionLinks>>[number];

const SessionRows = ({
  links,
  locale,
  pieces,
  readLabel,
  sessions,
}: {
  readonly links: readonly SessionLink[];
  readonly locale: Locale;
  readonly pieces: Awaited<ReturnType<typeof journal.piecesFromEvents>>;
  readonly readLabel: string;
  readonly sessions: readonly Session[];
}) => (
  <ul className="grid border-line border-b">
    {sessions.map((session) => {
      const written = pieces.filter((p) => p.event_id === session.id);
      // Outside links in the page's language only (one language per page).
      const outside = links.filter(
        (l) => l.event_id === session.id && localized(l, "label", locale)
      );
      return (
        <li
          className="grid gap-1 border-line border-t py-3 sm:grid-cols-[12rem_1fr] sm:gap-x-6"
          key={session.id}
        >
          <span className="type-caption text-text-secondary">
            {formatLongDate(session.starts_at, locale)}
          </span>
          <span className="grid gap-1">
            <Link className="link" href={`/events/${session.slug}`}>
              {localized(session, "title", locale)}
            </Link>
            {written.map((piece) => (
              <a
                className="type-caption link"
                href={journal.piecePath(piece)}
                key={piece.id}
              >
                {readLabel}: {localized(piece, "title", locale)}
              </a>
            ))}
            {outside.map((link) => (
              <a
                className="type-caption link"
                href={link.url}
                key={link.id}
                rel="noopener"
                target="_blank"
              >
                {localized(link, "label", locale)}
              </a>
            ))}
          </span>
        </li>
      );
    })}
  </ul>
);

const RECENT = 6;

/** The last few sessions, with the way to all of them. */
export const PastSessions = async ({
  locale,
  series,
}: {
  readonly locale: Locale;
  readonly series: Series;
}) => {
  const t = await getTranslations({ locale, namespace: "web.programs.page" });
  const past = await loadPast(series, RECENT + 1);
  if (past.sessions.length === 0) {
    return null;
  }
  return (
    <Section
      action={
        past.sessions.length > RECENT ? (
          <Link className="link" href={`${programPath(series)}/past`}>
            {t("allPast")}
          </Link>
        ) : null
      }
      id="past"
      title={t("past")}
    >
      <SessionRows
        links={past.links}
        locale={locale}
        pieces={past.pieces}
        readLabel={t("read")}
        sessions={past.sessions.slice(0, RECENT)}
      />
    </Section>
  );
};

/**
 * /events/<program>/past: every session past, newest first, with what
 * Qirtas wrote from each (the Salon's session archive, A31, and the same
 * for every program).
 */
export const ProgramPast = async ({
  locale,
  series,
}: {
  readonly locale: Locale;
  readonly series: Series;
}) => {
  const t = await getTranslations({ locale, namespace: "web.programs.page" });
  const past = await loadPast(series, 500);
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-10 px-4 py-16 sm:py-24">
      <header className="grid gap-4">
        <h1 className="type-display text-balance">
          {t("pastTitle", { program: localized(series, "name", locale) })}
        </h1>
        <p>
          <Link className="link" href={programPath(series)}>
            {localized(series, "name", locale)}
          </Link>
        </p>
      </header>
      {past.sessions.length > 0 ? (
        <SessionRows
          links={past.links}
          locale={locale}
          pieces={past.pieces}
          readLabel={t("read")}
          sessions={past.sessions}
        />
      ) : (
        <p className="type-body text-text-secondary">{t("noPast")}</p>
      )}
    </div>
  );
};

/** Book Circle's reviews in Voices, from its sessions (A32). */
const loadShelf = async (series: Series) =>
  readPublished(
    ["events", "journal"],
    async (c) => {
      const sessions =
        (await events.pastPublicEvents(c, {
          limit: 500,
          programmeId: series.id,
        })) ?? [];
      return journal.piecesFromEvents(
        c,
        sessions.map((s) => s.id),
        { category: "review", desk: "voices" }
      );
    },
    []
  );

/** The shelf: each book the circle read, as its review in Voices. */
const BookCircleShelf = async ({
  locale,
  series,
}: {
  readonly locale: Locale;
  readonly series: Series;
}) => {
  const t = await getTranslations({ locale, namespace: "web.programs.page" });
  const tj = await getTranslations({ locale, namespace: "web.journal" });
  const reviews = await loadShelf(series);
  if (reviews.length === 0) {
    return null;
  }
  return (
    <Section id="shelf" title={t("shelf")}>
      <Shelf
        items={reviews.map((review) => ({
          key: review.id,
          node: (
            <a
              className="grid aspect-[2/3] content-between border-line border-t pt-space-4 hover:border-text"
              href={journal.piecePath(review)}
            >
              <span className="type-subheading text-balance">
                {localized(review, "title", locale)}
              </span>
              {review.published_at ? (
                <span className="type-caption text-text-secondary">
                  {formatLongDate(review.published_at, locale)}
                </span>
              ) : null}
            </a>
          ),
        }))}
        label={t("shelf")}
        listLink={
          <Link className="link" href={`${programPath(series)}/shelf`}>
            {t("asList")}
          </Link>
        }
        nextLabel={tj("shelfNext")}
        previousLabel={tj("shelfPrevious")}
      />
    </Section>
  );
};

/**
 * Book Circle's vote (the design review A33, decision D12): the open
 * ballot's three books, where members vote; with none open, the last
 * ballot's result once it has closed (`programmes.ballot_counts()` shows
 * counts only then).
 */
const BookCircleVote = async ({
  locale,
  series,
}: {
  readonly locale: Locale;
  readonly series: Series;
}) => {
  const t = await getTranslations({ locale, namespace: "web.programs.page" });
  const ballots = await readPublished(
    ["programmes"],
    (c) => programmes.bookBallots(c, series.id),
    []
  );
  const now = Date.now();
  const ballot =
    ballots.find((b) => Date.parse(b.closes_at) > now && b.books.length > 0) ??
    ballots.find((b) => b.books.length > 0) ??
    null;
  if (!ballot) {
    return null;
  }
  const books = ballot.books.flatMap((book) =>
    localized(book, "title", locale)
      ? [
          {
            author: localized(book, "author", locale),
            id: book.id,
            title: localized(book, "title", locale),
          },
        ]
      : []
  );
  const title = localized(ballot, "title", locale) || t("vote.title");
  if (Date.parse(ballot.closes_at) > now) {
    return (
      <Section id="vote" title={title}>
        <p className="type-body max-w-prose">
          {t("vote.lede", {
            closes: formatLongDate(ballot.closes_at, locale),
          })}
        </p>
        <BookVote
          ballotId={ballot.id}
          books={books}
          closesAt={ballot.closes_at}
          path={programPath(series)}
        />
      </Section>
    );
  }
  const counts = await readPublished(
    ["programmes"],
    (c) => programmes.ballotCounts(c, ballot.id),
    []
  );
  const votesFor = (id: string) =>
    counts.find((c) => c.choice_id === id)?.votes ?? 0;
  const top = Math.max(0, ...counts.map((c) => c.votes));
  const chosen = books.filter(
    (book) =>
      top > 0 && counts.find((c) => c.choice_id === book.id)?.votes === top
  );
  if (chosen.length === 0) {
    return null;
  }
  return (
    <Section id="vote" title={title}>
      <p className="type-lede">
        {t("vote.chosen", {
          titles: chosen.map((b) => b.title).join(t("vote.and")),
        })}
      </p>
      <ul className="grid gap-1">
        {books.map((book) => (
          <li className="type-caption text-text-secondary" key={book.id}>
            {t("vote.count", {
              count: votesFor(book.id),
              title: book.title,
              votes: String(votesFor(book.id)),
            })}
          </li>
        ))}
      </ul>
    </Section>
  );
};

/** /events/book-circle/shelf: the same reviews as a plain list. */
export const BookCircleShelfList = async ({
  locale,
  series,
}: {
  readonly locale: Locale;
  readonly series: Series;
}) => {
  const t = await getTranslations({ locale, namespace: "web.programs.page" });
  const reviews = await loadShelf(series);
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-10 px-4 py-16 sm:py-24">
      <header className="grid gap-4">
        <h1 className="type-display text-balance">{t("shelf")}</h1>
        <p>
          <Link className="link" href={programPath(series)}>
            {localized(series, "name", locale)}
          </Link>
        </p>
      </header>
      {reviews.length === 0 ? (
        <p className="type-body text-text-secondary">{t("noShelf")}</p>
      ) : (
        <ul className="grid border-line border-b">
          {reviews.map((review) => (
            <li className="border-line border-t py-3" key={review.id}>
              <a className="link" href={journal.piecePath(review)}>
                {localized(review, "title", locale)}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/** Open Pages' prompt cards, written by the host in the Diwan (A35). */
const OpenPagesPrompts = async ({
  locale,
  series,
}: {
  readonly locale: Locale;
  readonly series: Series;
}) => {
  const t = await getTranslations({ locale, namespace: "web.programs.page" });
  const prompts = await readPublished(
    ["programmes"],
    (c) => programmes.publishedPrompts(c, series.id),
    []
  );
  const cards = prompts.filter((p) => localized(p, "text", locale));
  if (cards.length === 0) {
    return null;
  }
  return (
    <Section id="prompts" title={t("prompts")}>
      <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <li
            className="type-heading border-line border-t py-space-4 font-light"
            key={card.id}
          >
            {localized(card, "text", locale)}
          </li>
        ))}
      </ul>
    </Section>
  );
};

/**
 * The Typewriter Tour's Six Words wall (the design review A29, Nov 4,
 * 2026): the cards transcribed from the Tour (`programmes.six_words_wall`,
 * approved only), in the page's language, set in Ubuntu Mono like the
 * typewriter; and a typewriter to try, which keeps nothing (A30).
 */
const TypewriterTourWall = async ({ locale }: { readonly locale: Locale }) => {
  const t = await getTranslations({ locale, namespace: "web.programs.page" });
  const wall = (
    await readPublished(
      ["programmes"],
      (c) => programmes.sixWordsWall(c, 120),
      []
    )
  ).filter((entry) => entry.language === locale);
  return (
    <>
      {wall.length > 0 ? (
        <Section id="six-words" title={t("wall")}>
          <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
            {wall.map((entry) => (
              <li
                className="grid content-start gap-1 border-line border-t py-space-4"
                key={entry.id}
              >
                <p className="font-mono text-lg">{entry.text}</p>
                {localized(entry, "author", locale) ? (
                  <p className="type-caption text-text-secondary">
                    {localized(entry, "author", locale)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      <Section id="try" title={t("try")}>
        <TypingToy />
      </Section>
    </>
  );
};

/** What a program has that is its own, after its sessions. */
export const ProgramFeature = ({
  locale,
  series,
}: {
  readonly locale: Locale;
  readonly series: Series;
}) => {
  switch (series.slug) {
    case "second-chapter":
      return <SecondChapterGive locale={locale} />;
    case "typewriter-tour":
      return <TypewriterTourWall locale={locale} />;
    case "book-circle":
      return (
        <>
          <BookCircleVote locale={locale} series={series} />
          <BookCircleShelf locale={locale} series={series} />
        </>
      );
    case "open-pages":
      return <OpenPagesPrompts locale={locale} series={series} />;
    default:
      return null;
  }
};
