import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import {
  charity,
  events,
  journal,
  localized,
  programmes,
} from "@repo/sal-data";
import { getTranslations } from "next-intl/server";
import { BookVote } from "@/components/book-vote";
import { SecondChapterGive } from "@/components/second-chapter-give";
import { Section } from "@/components/section";
import { readPublished } from "@/lib/supabase";

/**
 * What an event carries besides its details (owner, Nov 5, 2026: every
 * event is a standard event, none in a series). Each part shows only when
 * the event has it, so every event's page has the one structure: the
 * add-ons the event was given in the Diwan: Student Life's approval of an
 * event off campus, prompts, a book vote, Second Chapter's collection, the
 * links from the night, and what Qirtas wrote from it.
 */
export const EventParts = async ({
  event,
  locale,
}: {
  readonly event: {
    id: string;
    off_campus: boolean;
    slug: string;
    student_life_approved_on: string | null;
  };
  readonly locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.events.parts" });
  const [prompts, ballots, campaign, links, pieces] = await Promise.all([
    readPublished(
      ["programmes"],
      (c) => programmes.publishedPrompts(c, event.id),
      []
    ),
    readPublished(
      ["programmes"],
      (c) => programmes.bookBallots(c, event.id),
      []
    ),
    readPublished(
      ["charity"],
      (c) => charity.campaignForEvent(c, event.id),
      null
    ),
    readPublished(["events"], (c) => events.sessionLinks(c, [event.id]), []),
    readPublished(
      ["journal"],
      (c) => journal.piecesFromEvents(c, [event.id]),
      []
    ),
  ]);
  const cards = prompts.filter((p) => localized(p, "text", locale));
  // Outside links in the page's language only (one language per page).
  const outside = links.filter((l) => localized(l, "label", locale));
  return (
    <>
      {event.off_campus && event.student_life_approved_on ? (
        <p className="type-caption text-text-secondary">
          {t("approved", {
            date: formatLongDate(event.student_life_approved_on, locale),
          })}
        </p>
      ) : null}
      {cards.length > 0 ? (
        <Section id="prompts" title={t("prompts")}>
          <ul className="grid gap-x-10 sm:grid-cols-2">
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
      ) : null}
      <EventVote ballots={ballots} locale={locale} slug={event.slug} />
      {campaign ? (
        <SecondChapterGive
          campaign={campaign}
          eventSlug={event.slug}
          locale={locale}
        />
      ) : null}
      {outside.length > 0 ? (
        <Section id="links" title={t("links")}>
          <ul className="grid gap-2">
            {outside.map((link) => (
              <li key={link.id}>
                <a
                  className="link"
                  href={link.url}
                  rel="noopener"
                  target="_blank"
                >
                  {localized(link, "label", locale)}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      {pieces.filter((p) => localized(p, "title", locale)).length > 0 ? (
        <Section id="qirtas" title={t("qirtas")}>
          <ul className="grid gap-2">
            {pieces
              .filter((p) => localized(p, "title", locale))
              .map((piece) => (
                <li key={piece.id}>
                  <a className="link" href={journal.piecePath(piece)}>
                    {localized(piece, "title", locale)}
                  </a>
                </li>
              ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
};

type Ballot = Awaited<ReturnType<typeof programmes.bookBallots>>[number];

/**
 * The book vote (the design review A33, decision D12), now an event's own:
 * the open ballot's books, where members vote; once it closes, the book
 * chosen (`programmes.ballot_counts()` shows counts only then).
 */
const EventVote = async ({
  ballots,
  locale,
  slug,
}: {
  readonly ballots: readonly Ballot[];
  readonly locale: Locale;
  readonly slug: string;
}) => {
  const t = await getTranslations({ locale, namespace: "web.programs.page" });
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
          path={`/events/${slug}`}
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
  const chosen = books.filter((book) => top > 0 && votesFor(book.id) === top);
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
