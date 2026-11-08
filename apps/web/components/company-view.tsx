import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ManageLinks } from "@/components/manage-links";
import { PageHeader, Section } from "@/components/section";
import { loadProgramme } from "@/components/series";
import { whatsOnPath } from "@/components/whats-on-page";
import { localized } from "@/lib/data";
import { roughlyNow } from "@/lib/this-year";
import { monthFrom } from "@/lib/whats-on";

/**
 * The Company, the Society's theater company, on its own page beside
 * Qirtas (decisions.md; not a program, not under What's on): what
 * it is, auditions, then a link to its dates on What's on
 * (/events?host=company). Performances are ordinary events.
 */
export const CompanyView = async ({ locale }: { locale: Locale }) => {
  const now = new Date(await roughlyNow());
  const company = await loadProgramme("company");
  if (!company) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.company" });

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:py-24">
      <PageHeader
        lede={localized(company, "summary", locale)}
        title={localized(company, "name", locale)}
      >
        {localized(company, "rhythm", locale) ? (
          <p className="type-body">{localized(company, "rhythm", locale)}</p>
        ) : null}
        <ManageLinks diwan="/company" />
      </PageHeader>
      <Section id="auditions" title={t("auditions")}>
        <p className="type-body max-w-prose">{t("auditionsLede")}</p>
        <p>
          <Link className="link" href="/company/auditions">
            {t("auditionsLink")}
          </Link>
        </p>
      </Section>
      <p>
        <Link
          className="link"
          href={whatsOnPath(monthFrom(undefined, now), "company")}
        >
          {t("dates")}
        </Link>
      </p>
    </div>
  );
};
