import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { events, localized } from "@repo/sal-data";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ManageLinks } from "@/components/manage-links";
import { Productions } from "@/components/productions";
import { PageHeader, Section } from "@/components/section";
import { loadProgramme } from "@/components/series";
import { MonthCalendar, MonthSection, nextAfter } from "@/components/whats-on";
import { readPublished } from "@/lib/supabase";
import { monthFrom } from "@/lib/whats-on";

/**
 * The Company, the Society's theater company, on its own page beside
 * Qirtas (owner, Oct 30, 2026; not a program, not under What's on): what
 * it is, its productions, auditions, then its month of dates.
 */
export const CompanyView = async ({
  locale,
  month: monthValue,
}: {
  locale: Locale;
  month?: string;
}) => {
  const company = await loadProgramme("company");
  if (!company) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.company" });
  const month = monthFrom(monthValue);
  const rows = await readPublished(
    ["events"],
    (c) => events.calendar(c, month.from, month.to),
    []
  );
  const own = rows.filter((row) => row.programme_id === company.id);
  const next = own.length === 0 ? await nextAfter(month, company.id) : null;

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
      <Productions locale={locale} />
      <Section id="auditions" title={t("auditions")}>
        <p className="type-body max-w-prose">{t("auditionsLede")}</p>
        <p>
          <Link className="link" href="/company/auditions">
            {t("auditionsLink")}
          </Link>
        </p>
      </Section>
      <MonthSection
        hrefFor={(m) => `/company/${m}`}
        locale={locale}
        month={month}
      >
        <MonthCalendar locale={locale} month={month} next={next} rows={own} />
      </MonthSection>
    </div>
  );
};
