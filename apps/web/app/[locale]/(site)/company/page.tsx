import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { events, localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Productions } from "@/components/productions";
import { PageHeader, Section } from "@/components/section";
import { loadProgramme, seriesMetadata } from "@/components/series";
import { MonthCalendar, MonthSection, nextAfter } from "@/components/whats-on";
import { readPublished } from "@/lib/supabase";
import { monthFrom } from "@/lib/whats-on";

interface CompanyProps {
  readonly params: Promise<{ locale: Locale }>;
  readonly searchParams: Promise<{ month?: string }>;
}

export const generateMetadata = async ({
  params,
}: CompanyProps): Promise<Metadata> => {
  const { locale } = await params;
  const company = await loadProgramme("company");
  return company ? seriesMetadata(locale, company) : {};
};

/**
 * The Company, the Society's theater company, on its own page beside
 * Qirtas (owner, Oct 30, 2026; not a program, not under What's on): what
 * it is, its productions, auditions, then its month of dates.
 */
const CompanyPage = async ({ params, searchParams }: CompanyProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  // Read the month first: it makes the page render on request, so a build
  // that can't find the row never leaves a cached "not found".
  const { month: monthValue } = await searchParams;
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
        hrefFor={(m) => ({ pathname: "/company", query: { month: m } })}
        locale={locale}
        month={month}
      >
        <MonthCalendar locale={locale} month={month} next={next} rows={own} />
      </MonthSection>
    </div>
  );
};

export default CompanyPage;
