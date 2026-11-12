import { Button } from "@repo/brand/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ManageLinks } from "@/components/manage-links";
import { PageHeader, Section } from "@/components/section";
import { loadProgramme } from "@/components/series";
import { whatsOnPath } from "@/components/whats-on-page";
import { localized, productions, programmes } from "@/lib/data";
import { readPublished } from "@/lib/supabase";
import { roughlyNow } from "@/lib/this-year";
import { monthFrom } from "@/lib/whats-on";

/**
 * The Company, the Society's theater company (decisions.md, What the
 * Society does: the Company): what it is, the first season's plan, how
 * auditions are announced (never open here: they are RSVP events on
 * Events, scored on audition-score-sheet), the Artistic Director opening while it is
 * open, and each public production with its playbill from the roles
 * scoped to it. Performances are ordinary events. No rights, no show: a
 * production is listed only once its rights are cleared.
 */
export const CompanyView = async ({ locale }: { locale: Locale }) => {
  const now = new Date(await roughlyNow());
  const company = await loadProgramme("company");
  if (!company) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.company" });
  const [shows, places] = await Promise.all([
    readPublished(["productions"], (c) => productions.publicProductions(c), []),
    readPublished(["programmes"], (c) => programmes.openPlaces(c), []),
  ]);
  const opening = places.find((p) => p.role === "artistic_director");
  const bills = await Promise.all(
    shows.map((show) =>
      readPublished(
        ["productions"],
        (c) => productions.playbill(c, show.id),
        []
      )
    )
  );

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:py-24">
      <PageHeader
        lede={localized(company, "summary", locale)}
        title={localized(company, "name", locale)}
      >
        <ManageLinks diwan="/company" />
      </PageHeader>
      <Section id="season" title={t("season")}>
        <p className="type-body max-w-prose">{t("seasonPlan")}</p>
      </Section>
      {opening ? (
        <Section id="artistic-director" title={t("openingTitle")}>
          <p className="type-body max-w-prose">{t("openingBody")}</p>
          <p>
            <Link className="link" href={`/get-involved/${opening.id}`}>
              {localized(opening, "title", locale)}
            </Link>
          </p>
        </Section>
      ) : null}
      {shows.length > 0 ? (
        <Section id="productions" title={t("productions")}>
          <ul className="grid gap-10">
            {shows.map((show, index) => (
              <li
                className="border-line grid gap-3 border-t pt-4"
                key={show.id}
              >
                <h3 className="type-subheading">
                  {localized(show, "title", locale)}
                </h3>
                {show.playwright ? (
                  <p className="type-caption text-text-secondary">
                    {t("by", { playwright: show.playwright })}
                  </p>
                ) : null}
                {localized(show, "summary", locale) ? (
                  <p className="type-body max-w-prose">
                    {localized(show, "summary", locale)}
                  </p>
                ) : null}
                {(bills[index] ?? []).length > 0 ? (
                  <dl className="grid gap-1 sm:grid-cols-[14rem_1fr]">
                    {(bills[index] ?? []).map((line) => (
                      <div
                        className="contents"
                        key={`${line.role_key}-${line.name_en}`}
                      >
                        <dt className="type-label">
                          {locale === "ar" ? line.role_ar : line.role_en}
                        </dt>
                        <dd>
                          {locale === "ar"
                            ? line.name_ar || line.name_en
                            : line.name_en}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      <Section id="auditions" title={t("auditions")}>
        <p className="type-body max-w-prose">{t("auditionsLede")}</p>
      </Section>
      {/* The page's one action (the third prompt, §7): auditions and
          performances are the Company's dates on Events. */}
      <p>
        <Button asChild>
          <Link href={whatsOnPath(monthFrom(undefined, now), "company")}>
            {t("dates")}
          </Link>
        </Button>
      </p>
    </div>
  );
};
