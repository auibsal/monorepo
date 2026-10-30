import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { governance, localized } from "@repo/sal-data";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Council } from "@/components/council";
import { PageHeader, Section } from "@/components/section";
import { type LocaleParams, sectionMetadata } from "@/lib/page";
import { readPublished } from "@/lib/supabase";

export const generateMetadata = sectionMetadata(
  "web.governance",
  "/governance"
);

type Results = Awaited<ReturnType<typeof governance.publicElectionResults>>;

/** One entry per published election, its offices in order. */
const byElection = (rows: Results) => {
  const elections = new Map<string, Results>();
  for (const row of rows) {
    elections.set(row.election_id, [
      ...(elections.get(row.election_id) ?? []),
      row,
    ]);
  }
  return [...elections.values()];
};

/**
 * How the Society is run, in public: the Council, from the roles people
 * hold, the resolutions it adopted and who members elected. Only what the
 * database makes public is read (the Council, adopted resolutions, each published election's
 * outcome per office); minutes and the counts at each round stay in the
 * Nexus.
 */
const GovernancePage = async ({ params }: LocaleParams) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.governance" });
  const [council, resolutions, results] = await Promise.all([
    readPublished(["governance"], (c) => governance.councilMembers(c), []),
    readPublished(["governance"], (c) => governance.adoptedResolutions(c), []),
    readPublished(
      ["governance"],
      (c) => governance.publicElectionResults(c),
      []
    ),
  ]);
  const elections = byElection(results);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-20 px-4 py-16 sm:py-24">
      <PageHeader lede={t("lede")} title={t("title")} />

      <Section id="council" title={t("council")}>
        {council.length === 0 ? (
          <p className="type-body">{t("councilEmpty")}</p>
        ) : (
          <Council locale={locale} members={council} />
        )}
      </Section>

      <Section id="resolutions" title={t("resolutions")}>
        {resolutions.length === 0 ? (
          <p className="type-body">{t("resolutionsEmpty")}</p>
        ) : (
          <ul className="grid gap-4">
            {resolutions.map((r) => (
              <li className="grid gap-1 border-line border-b pb-4" key={r.id}>
                <p className="type-caption text-text-secondary">
                  <span dir="ltr">{r.code}</span> ·{" "}
                  {t(
                    r.body === "general_assembly"
                      ? "body.general_assembly"
                      : "body.council"
                  )}
                  {r.adopted_on
                    ? ` · ${formatLongDate(r.adopted_on, locale)}`
                    : null}
                </p>
                <p className="type-subheading">
                  {localized(r, "title", locale)}
                </p>
                {r.votes_for === null ? null : (
                  <p className="type-caption">
                    {t("votes", {
                      abstain: formatNumber(r.votes_abstain ?? 0, locale),
                      against: formatNumber(r.votes_against ?? 0, locale),
                      for: formatNumber(r.votes_for, locale),
                    })}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="elections" title={t("elections")}>
        {elections.length === 0 ? (
          <p className="type-body">{t("electionsEmpty")}</p>
        ) : (
          elections.map((offices) => {
            const [first] = offices;
            if (!first) {
              return null;
            }
            return (
              <div className="grid gap-3" key={first.election_id}>
                <h3 className="type-subheading">
                  {localized(first, "election_title", locale)}
                </h3>
                <p className="type-caption text-text-secondary">
                  {formatLongDate(first.voting_closes_at, locale)}
                  {first.eligible_count
                    ? ` · ${t("turnout", {
                        counted: formatNumber(first.ballots_counted, locale),
                        eligible: formatNumber(first.eligible_count, locale),
                      })}`
                    : null}
                </p>
                <dl className="grid gap-2 sm:grid-cols-2">
                  {offices.map((office) => (
                    <div
                      className="grid gap-1 border-line border-t py-space-4"
                      key={office.position_title_en}
                    >
                      <dt className="type-label">
                        {localized(office, "position_title", locale)}
                      </dt>
                      <dd className="type-body">
                        {office.ron_won
                          ? t("reopened")
                          : localized(office, "winner_name", locale)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })
        )}
      </Section>

      <p className="type-body">
        {t("rules")}{" "}
        <Link className="link" href="/library">
          {t("documents")}
        </Link>
      </p>
    </div>
  );
};

export default GovernancePage;
