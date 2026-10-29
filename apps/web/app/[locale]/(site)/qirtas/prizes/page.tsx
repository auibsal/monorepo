import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { journal, localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Nameplate } from "@/components/waraq/nameplate";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface PrizesProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: PrizesProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.prizes" });
  const paper = await getTranslations({ locale, namespace: "web.journal" });
  return localizedMetadata(locale, "/qirtas/prizes", {
    description: t("lede"),
    title: `${t("title")} · ${paper("title")}`,
  });
};

/**
 * The Qirtas Prizes (owner, Oct 29, 2026): the six prizes, and for the
 * latest round its dates, its shortlists from their day and its winners
 * from theirs.
 */
const PrizesPage = async ({ params }: PrizesProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.prizes" });
  const tj = await getTranslations({ locale, namespace: "web.journal" });
  const [all, rounds] = await Promise.all([
    readPublished(["journal"], (c) => journal.prizes(c), []),
    readPublished(["journal"], (c) => journal.prizeRounds(c), []),
  ]);
  const round = rounds.find((r) => r.is_published) ?? null;
  const results = round
    ? await readPublished(
        ["journal"],
        (c) => journal.prizeResults(c, round.slug),
        []
      )
    : [];

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10">
      <Nameplate locale={locale} small />
      <header className="grid gap-2">
        <h1 className="type-display">{t("title")}</h1>
        <p className="type-lede max-w-3xl">{t("lede")}</p>
        {round ? (
          <p className="type-body">
            {t("dates", {
              awarded: formatLongDate(round.awarded_on, locale),
              round: localized(round, "title", locale),
              shortlist: formatLongDate(round.shortlist_on, locale),
            })}
          </p>
        ) : null}
      </header>
      <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
        {all.map((prize) => {
          const entries = results.filter((r) => r.prize_key === prize.key);
          return (
            <li
              className="grid content-start gap-3 border-line border-t py-space-4"
              key={prize.key}
            >
              <h2 className="type-heading">
                {localized(prize, "name", locale)}
              </h2>
              <p className="type-caption">
                {prize.desk
                  ? tj(`desks.${prize.desk as journal.Desk}`)
                  : t("wholePaper")}
              </p>
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
                        href={`/qirtas/pieces/${entry.piece_slug}`}
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
    </div>
  );
};

export default PrizesPage;
