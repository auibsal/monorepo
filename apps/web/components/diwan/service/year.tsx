"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import type { Locale } from "@repo/internationalization";
import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { localized, membership, recognition, unwrap } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { DiwanPage, DiwanSection, RowList } from "../page";
import { ErrorState, SectionSpinner } from "../states";

/** The platform's first year: nothing is on record before it. */
export const FIRST_YEAR = 2026;

const yearLabel = (year: number) => `${year}–${String(year + 1).slice(2)}`;

const yearPath = (year: number) => `/account/record/year/${year}`;

const Row = ({
  children,
  date,
}: {
  readonly children: ReactNode;
  readonly date: string;
}) => (
  <li className="grid gap-1 sm:grid-cols-[14rem_1fr] sm:gap-x-6">
    <span className="type-caption text-text-secondary">{date}</span>
    <span className="type-body">{children}</span>
  </li>
);

/**
 * A member's year at the Society, private and printable (the design review
 * C23): what their own records hold for the Society's year, nothing more,
 * read as themselves. Printed on white without the site's frame.
 */
export const YearSummary = ({ year }: { readonly year: number }) => {
  const t = useTranslations("diwan.service.year");
  const tk = useTranslations("diwan.service");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const summary = useQuery({
    queryFn: async () => {
      const id = (await supabase.auth.getUser()).data.user?.id ?? "";
      const [data, card, profile] = await Promise.all([
        recognition.myYear(supabase, id, year),
        membership.myCard(supabase),
        supabase
          .schema("core")
          .from("profiles")
          .select("full_name_en, full_name_ar")
          .eq("id", id)
          .maybeSingle(),
      ]);
      return { ...data, card, profile: unwrap(profile) };
    },
    queryKey: ["my-year", year],
  });

  if (summary.isPending) {
    return <SectionSpinner />;
  }
  if (summary.isError) {
    return <ErrorState onRetry={() => summary.refetch()} />;
  }
  const s = summary.data;
  const name = s.profile
    ? localized(s.profile, "full_name", locale) || s.profile.full_name_en
    : "";
  const current = recognition.societyYearOf();
  const day = (value: string) => formatLongDate(value, locale, true);

  return (
    <div className="bg-surface text-text" data-theme="light">
      <DiwanPage
        lede={t("lede")}
        narrow
        title={t("title", { year: yearLabel(year) })}
      >
        <div className="grid gap-1">
          <p className="type-heading font-light">{name}</p>
          {s.card ? (
            <p className="type-caption text-text-secondary">
              {t("card", { number: String(s.card.number) })}
            </p>
          ) : null}
        </div>
        <p className="flex flex-wrap items-baseline gap-x-6 gap-y-2 print:hidden">
          <Button onClick={() => window.print()} variant="outline">
            {t("print")}
          </Button>
          {year > FIRST_YEAR ? (
            <Link className="link" href={yearPath(year - 1)}>
              {yearLabel(year - 1)}
            </Link>
          ) : null}
          {year < current ? (
            <Link className="link" href={yearPath(year + 1)}>
              {yearLabel(year + 1)}
            </Link>
          ) : null}
          <Link className="link" href="/account/record">
            {tk("title")}
          </Link>
        </p>

        <DiwanSection id="events" title={t("events")}>
          {s.events.length === 0 ? (
            <p className="type-body text-text-secondary">{t("none")}</p>
          ) : (
            <RowList>
              {s.events.map((c) => (
                <Row date={day(c.checked_in_at)} key={c.id}>
                  {c.event ? localized(c.event, "title", locale) : ""}
                </Row>
              ))}
            </RowList>
          )}
        </DiwanSection>

        <DiwanSection id="roles" title={t("roles")}>
          {s.roles.length === 0 ? (
            <p className="type-body text-text-secondary">{t("none")}</p>
          ) : (
            <RowList>
              {s.roles.map((r) => (
                <Row
                  date={
                    r.ends_at
                      ? t("between", {
                          from: day(r.starts_at),
                          to: day(r.ends_at),
                        })
                      : t("since", { from: day(r.starts_at) })
                  }
                  key={r.id}
                >
                  {localized(r, "title", locale) ||
                    (r.roles ? localized(r.roles, "name", locale) : r.role)}
                </Row>
              ))}
            </RowList>
          )}
        </DiwanSection>

        <DiwanSection id="service" title={t("service")}>
          <p className="type-body">
            {tk("hours", { hours: formatNumber(s.hours) })}
          </p>
          {s.service.length > 0 ? (
            <RowList>
              {s.service.map((r) => (
                <Row date={day(r.occurred_on)} key={r.id}>
                  <span dir="auto">{r.activity}</span> ·{" "}
                  {tk("hours", { hours: formatNumber(Number(r.hours)) })}
                </Row>
              ))}
            </RowList>
          ) : null}
        </DiwanSection>

        <DiwanSection id="work" title={t("work")}>
          {s.submissions.length === 0 ? (
            <p className="type-body text-text-secondary">{t("none")}</p>
          ) : (
            <>
              <p className="type-body">
                {t("workCount", {
                  accepted: formatNumber(
                    s.submissions.filter((w) => w.status === "accepted").length
                  ),
                  sent: formatNumber(s.submissions.length),
                })}
              </p>
              <RowList>
                {s.submissions.map((w) => (
                  <Row date={day(w.created_at)} key={w.id}>
                    <span dir="auto">{w.title}</span>
                    {w.status === "accepted" ? ` · ${t("accepted")}` : ""}
                  </Row>
                ))}
              </RowList>
            </>
          )}
        </DiwanSection>

        <DiwanSection id="certificates" title={tk("certificatesTitle")}>
          {s.certificates.length === 0 ? (
            <p className="type-body text-text-secondary">{t("none")}</p>
          ) : (
            <RowList>
              {s.certificates.map((c) => (
                <Row date={c.issued_at ? day(c.issued_at) : ""} key={c.id}>
                  <Link
                    className="link"
                    href={`/account/record/certificates/${c.id}`}
                  >
                    {tk(`kinds.${c.kind as recognition.CertificateKind}`)}
                  </Link>
                  {c.serial ? ` · ${c.serial}` : ""}
                </Row>
              ))}
            </RowList>
          )}
        </DiwanSection>

        <p className="type-caption text-text-secondary">{t("private")}</p>
      </DiwanPage>
    </div>
  );
};

/** On Record: this year's summary, and last year's once there is one. */
export const YearLinks = () => {
  const t = useTranslations("diwan.service.year");
  const current = recognition.societyYearOf();
  const years = [current, current - 1].filter((y) => y >= FIRST_YEAR);
  return (
    <DiwanSection id="years" title={t("section")}>
      <p className="type-body">{t("sectionLede")}</p>
      <ul className="flex flex-wrap gap-x-6 gap-y-2">
        {years.map((y) => (
          <li key={y}>
            <Link className="link" href={yearPath(y)}>
              {t("title", { year: yearLabel(y) })}
            </Link>
          </li>
        ))}
      </ul>
    </DiwanSection>
  );
};
