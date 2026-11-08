import type { Locale } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { NewsletterSignup } from "@/components/newsletter/signup";
import { content, events, journal, localized } from "@/lib/data";
import { type Issue, issueOf } from "@/lib/sunday-paper";
import { readPublished } from "@/lib/supabase";

/** Whether a moment comes before the end of a window. */
const isBefore = (at: string, end: Date) =>
  end.getTime() - new Date(at).getTime() > 0;

/** What an issue carried, from the records, in this language. */
const issueContents = async (issue: Issue, locale: Locale) => {
  const [pieces, upcoming] = await Promise.all([
    readPublished(
      ["journal"],
      (c) => journal.piecesBetween(c, issue.piecesFrom, issue.sunday),
      []
    ),
    readPublished(
      ["events"],
      (c) => events.publicEvents(c, { from: issue.sunday, limit: 60 }),
      []
    ),
  ]);
  return {
    events: (upcoming ?? []).filter((e) => isBefore(e.starts_at, issue.until)),
    pieces: journal.inLanguage(pieces, locale),
  };
};

/** The issues already sent, newest first: only the months recorded as sent. */
export const pastIssues = async () => {
  const sent = await readPublished(
    ["news"],
    (c) => content.sundayPaperIssues(c),
    []
  );
  return sent.map(({ month }) => {
    const [year, number] = month.split("-").map(Number);
    return issueOf(year ?? 0, (number ?? 1) - 1);
  });
};

/**
 * One issue of the Sunday Paper, in a newspaper's layout (design review
 * C17): the nameplate and its Sunday, Qirtas's pieces of the month before
 * in columns by section, and What's on for the month after. Rebuilt from
 * the same records the email was made from; the open places of the time
 * are not kept, so they are not shown.
 */
export const SundayPaperIssue = async ({
  issue,
  locale,
}: {
  issue: Issue;
  locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.newsletter" });
  const tj = await getTranslations({ locale, namespace: "web.journal" });
  const { events: on, pieces } = await issueContents(issue, locale);
  const desks = journal.desks.filter((d) => pieces.some((p) => p.desk === d));

  return (
    <article className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12">
      <header className="border-text grid justify-items-center gap-3 border-b-2 pb-4 text-center">
        <h1 className="text-5xl font-light tracking-tight sm:text-7xl">
          {t("title")}
        </h1>
        <p className="type-caption border-text flex w-full flex-wrap justify-between gap-x-6 border-t pt-2">
          <span>{formatLongDate(issue.sunday, locale)}</span>
          <span>{t("archive.issueLine")}</span>
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
        <section
          aria-labelledby="issue-qirtas"
          className="grid content-start gap-4"
        >
          <h2
            className="type-label border-text border-b pb-2"
            id="issue-qirtas"
          >
            {tj("title")}
          </h2>
          {desks.length === 0 ? (
            <p className="type-body text-text-secondary">
              {t("archive.noPieces")}
            </p>
          ) : (
            <div className="gap-8 sm:columns-2">
              {desks.map((desk) => (
                <div className="mb-8 grid break-inside-avoid gap-3" key={desk}>
                  <h3 className="type-subheading">{tj(`desks.${desk}`)}</h3>
                  <ul className="grid gap-3">
                    {pieces
                      .filter((p) => p.desk === desk)
                      .map((p) => (
                        <li className="border-line border-t pt-3" key={p.id}>
                          <Link
                            className="hover:text-accent grid gap-1"
                            href={journal.piecePath(p)}
                          >
                            <span className="type-heading">
                              {localized(p, "title", locale)}
                            </span>
                            {localized(p, "deck", locale) ? (
                              <span className="type-body text-text-secondary">
                                {localized(p, "deck", locale)}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          aria-labelledby="issue-on"
          className="grid content-start gap-4"
        >
          <h2 className="type-label border-text border-b pb-2" id="issue-on">
            {t("archive.whatsOn")}
          </h2>
          {on.length === 0 ? (
            <p className="type-body text-text-secondary">
              {t("archive.noEvents")}
            </p>
          ) : (
            <ul className="grid gap-3">
              {on.map((e) => (
                <li className="border-line border-t pt-3" key={e.id}>
                  <Link
                    className="hover:text-accent grid gap-1"
                    href={`/events/${e.slug}`}
                  >
                    <span className="type-caption">
                      {`${formatLongDate(e.starts_at, locale)}, ${formatClock(e.starts_at, locale)}`}
                    </span>
                    <span className="type-subheading">
                      {localized(e, "title", locale)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* The sign-up itself, not a link to it (decisions.md): one
          step fewer for a reader who has just read an issue. */}
      <section
        aria-labelledby="next-issue"
        className="border-line grid gap-3 border-t pt-6 print:hidden"
      >
        <h2 className="type-heading" id="next-issue">
          {t("archive.subscribe")}
        </h2>
        <NewsletterSignup compact />
      </section>
    </article>
  );
};
