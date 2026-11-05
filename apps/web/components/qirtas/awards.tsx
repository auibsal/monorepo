import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { journal, localized } from "@repo/sal-data";
import { getTranslations } from "next-intl/server";
import { readPublished } from "@/lib/supabase";

export type Round = Awaited<ReturnType<typeof journal.awardRounds>>[number];

/** The published rounds, the latest first. */
export const publishedRounds = async () =>
  (await readPublished(["journal"], (c) => journal.awardRounds(c), [])).filter(
    (round) => round.is_published
  );

/** A round's dates in one line. */
export const RoundDates = async ({
  locale,
  round,
}: {
  readonly locale: Locale;
  readonly round: Round;
}) => {
  const t = await getTranslations({ locale, namespace: "web.awards" });
  return (
    <p className="type-body">
      {t("dates", {
        awarded: formatLongDate(round.awarded_on, locale),
        round: localized(round, "title", locale),
        shortlist: formatLongDate(round.shortlist_on, locale),
      })}
    </p>
  );
};

/**
 * One round of the Qirtas Awards: each award with its shortlist from its
 * day and its winner from theirs (`journal.award_results()` decides what
 * shows, never this page).
 */
export const AwardsRound = async ({
  locale,
  round,
}: {
  readonly locale: Locale;
  readonly round: Round | null;
}) => {
  const t = await getTranslations({ locale, namespace: "web.awards" });
  const tj = await getTranslations({ locale, namespace: "web.journal" });
  const [all, results] = await Promise.all([
    readPublished(["journal"], (c) => journal.awards(c), []),
    round
      ? readPublished(
          ["journal"],
          (c) => journal.awardResults(c, round.slug),
          []
        )
      : Promise.resolve([]),
  ]);
  // Each entry links to its piece, whose address carries its section.
  const desks = new Map(
    results.length > 0
      ? (await readPublished(["journal"], journal.publishedPieceSlugs, [])).map(
          (piece) => [piece.slug, piece.desk] as const
        )
      : []
  );
  return (
    <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
      {all.map((award) => {
        const entries = results.filter((r) => r.award_key === award.key);
        return (
          <li
            className="grid content-start gap-3 border-line border-t py-space-4"
            key={award.key}
          >
            <h2 className="type-heading">{localized(award, "name", locale)}</h2>
            <p className="type-caption">
              {award.desk
                ? tj(`desks.${award.desk as journal.Desk}`)
                : t("wholePaper")}
            </p>
            {localized(award, "for", locale) ? (
              <p className="type-body">{localized(award, "for", locale)}</p>
            ) : null}
            {localized(award, "named_for", locale) ? (
              <p className="type-caption text-text-secondary">
                {localized(award, "named_for", locale)}
              </p>
            ) : null}
            {entries.length === 0 ? (
              <p className="type-body text-text-secondary">
                {round ? t("shortlistOn") : t("noRound")}
              </p>
            ) : (
              <ul className="grid gap-2">
                {entries.map((entry) => (
                  <li key={entry.piece_slug}>
                    <Link
                      className="link"
                      href={journal.piecePath({
                        desk: desks.get(entry.piece_slug),
                        slug: entry.piece_slug,
                      })}
                    >
                      {localized(entry, "title", locale)}
                    </Link>
                    {localized(entry, "author", locale) ? (
                      <span className="type-caption">
                        {" · "}
                        {localized(entry, "author", locale)}
                      </span>
                    ) : null}
                    {entry.won ? (
                      <span className="type-caption">
                        {" · "}
                        {t("winner")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
};

/** Every other year's round, each at its own address. */
export const OtherYears = async ({
  current,
  locale,
  rounds,
}: {
  readonly current: string | null;
  readonly locale: Locale;
  readonly rounds: readonly Round[];
}) => {
  const t = await getTranslations({ locale, namespace: "web.awards" });
  const others = rounds.filter((round) => round.slug !== current);
  if (others.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="years" className="grid gap-4">
      <h2 className="type-heading" id="years">
        {t("byYear")}
      </h2>
      <ul className="grid border-line border-b">
        {others.map((round) => (
          <li className="border-line border-t py-3" key={round.slug}>
            <Link className="link" href={`/qirtas/awards/${round.slug}`}>
              {localized(round, "title", locale)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
