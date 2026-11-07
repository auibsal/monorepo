import type { Locale } from "@repo/internationalization";
import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { journal, localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface PrizeProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: PrizeProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.prize" });
  return localizedMetadata(locale, "/qirtas/prize", {
    description: t("lede"),
    title: t("title"),
  });
};

/**
 * The Mutanabbi Prize (owner, Nov 7, 2026; replaces the Qirtas Awards):
 * two categories, Qirtas and Qalam. Editors shortlist; an outside judge
 * scores each work out of 100, blind; voting members vote online for one
 * work in each category. Final score: 70% judge, 30% members (each work's
 * vote share scaled so the most-voted work scores 100); a tie goes to the
 * judge. Results show from the award day, once published
 * (`journal.prize_results()`).
 */
const PrizePage = async ({ params }: PrizeProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.prize" });
  const rounds = await readPublished(
    ["journal"],
    (c) => journal.prizeRounds(c),
    []
  );
  const results = await Promise.all(
    rounds.map((round) =>
      readPublished(["journal"], (c) => journal.prizeResults(c, round.id), [])
    )
  );
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-10 px-4 py-10">
      <header className="grid gap-3">
        <h1 className="type-display">{t("title")}</h1>
        <p className="type-lede">{t("lede")}</p>
      </header>
      <section aria-labelledby="how" className="grid gap-3">
        <h2 className="type-heading" id="how">
          {t("how.title")}
        </h2>
        <ul className="grid gap-2">
          {(["categories", "judging", "score", "eligible"] as const).map(
            (key) => (
              <li className="type-body border-line border-t pt-2" key={key}>
                {t(`how.${key}`)}
              </li>
            )
          )}
        </ul>
      </section>
      {rounds.map((round, index) => {
        const rows = results[index] ?? [];
        if (rows.length === 0) {
          return null;
        }
        return (
          <section
            aria-labelledby={`round-${round.year}`}
            className="grid gap-4"
            key={round.id}
          >
            <h2 className="type-heading" id={`round-${round.year}`}>
              {t("round", { year: String(round.year) })}
            </h2>
            {round.awarded_on ? (
              <p className="type-caption">
                {t("awardedOn", {
                  date: formatLongDate(round.awarded_on, locale),
                })}
              </p>
            ) : null}
            {journal.PRIZE_CATEGORIES.map((category) => {
              const ranked = rows.filter((r) => r.category === category);
              if (ranked.length === 0) {
                return null;
              }
              return (
                <div className="grid gap-2" key={category}>
                  <h3 className="type-subheading">
                    {t(`categories.${category}`)}
                  </h3>
                  <ol className="grid border-line border-b">
                    {ranked.map((r) => (
                      <li
                        className="grid gap-0.5 border-line border-t py-3"
                        key={r.entry_id}
                      >
                        <span className="type-body">
                          {r.piece_slug ? (
                            <Link
                              className="link"
                              href={journal.piecePath({
                                desk: r.desk,
                                slug: r.piece_slug,
                              })}
                            >
                              {localized(r, "title", locale)}
                            </Link>
                          ) : (
                            localized(r, "title", locale)
                          )}
                        </span>
                        <span className="type-caption">
                          {[
                            localized(r, "byline", locale),
                            t("finalScore", {
                              score: formatNumber(Number(r.final_score)),
                            }),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
};

export default PrizePage;
