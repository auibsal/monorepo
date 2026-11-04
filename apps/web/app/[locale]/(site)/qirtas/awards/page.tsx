import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { journal, localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShareLink } from "@/components/share";
import { Nameplate } from "@/components/waraq/nameplate";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface AwardsProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: AwardsProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.awards" });
  const paper = await getTranslations({ locale, namespace: "web.journal" });
  return localizedMetadata(locale, "/qirtas/awards", {
    description: t("lede"),
    title: `${t("title")} · ${paper("title")}`,
  });
};

/**
 * The Qirtas Awards (owner, Oct 29, 2026; "Awards", Oct 31): the six
 * awards, what each is for and whom it is named for, and for the latest
 * round its dates, its shortlists from their day and its winners from
 * theirs. The code keeps the name `awards`.
 */
const AwardsPage = async ({ params }: AwardsProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.awards" });
  const tj = await getTranslations({ locale, namespace: "web.journal" });
  const [all, rounds] = await Promise.all([
    readPublished(["journal"], (c) => journal.awards(c), []),
    readPublished(["journal"], (c) => journal.awardRounds(c), []),
  ]);
  const round = rounds.find((r) => r.is_published) ?? null;
  const results = round
    ? await readPublished(
        ["journal"],
        (c) => journal.awardResults(c, round.slug),
        []
      )
    : [];
  // Each entry links to its piece, whose address carries its section.
  const desks = new Map(
    results.length > 0
      ? (await readPublished(["journal"], journal.publishedPieceSlugs, [])).map(
          (piece) => [piece.slug, piece.desk] as const
        )
      : []
  );

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
        <p className="type-body max-w-3xl">{t("judging")}</p>
        <p className="type-body max-w-3xl">{t("rewards")}</p>
        <ShareLink title={t("title")} />
      </header>
      <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
        {all.map((award) => {
          const entries = results.filter((r) => r.award_key === award.key);
          return (
            <li
              className="grid content-start gap-3 border-line border-t py-space-4"
              key={award.key}
            >
              <h2 className="type-heading">
                {localized(award, "name", locale)}
              </h2>
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
    </div>
  );
};

export default AwardsPage;
