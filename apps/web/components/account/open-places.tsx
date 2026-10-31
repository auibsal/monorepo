"use client";

import { useAuth } from "@repo/auth/provider";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { localized, programmes } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { DiwanSection, RowList } from "@/components/nexus/page";
import {
  EmptyLine,
  ErrorState,
  SectionSpinner,
} from "@/components/nexus/states";

/** The board's groups, in order: inside the Society first, then out. */
const GROUPS = [
  "role",
  "apprenticeship",
  "first_ink",
  "volunteer",
  "partner",
] as const;

type Group = (typeof GROUPS)[number];

/**
 * Every open place, for anyone to read (owner, Oct 31, 2026: Get involved
 * is the careers page, inside the Society and with its partners): roles,
 * the Apprenticeship (the internship), First Ink, volunteering and places
 * with partners, then the Company's auditions. Replying takes membership.
 */
export const OpenPlaces = () => {
  const t = useTranslations("nexus.getInvolved");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const places = useQuery({
    queryFn: () => programmes.openPlaces(supabase),
    queryKey: ["open-places"],
  });
  if (places.isPending) {
    return <SectionSpinner />;
  }
  if (places.isError) {
    return <ErrorState onRetry={() => places.refetch()} />;
  }
  const groups = GROUPS.map((group) => ({
    group,
    rows: places.data.filter((row) => row.kind === group),
  }));
  return (
    <>
      {groups.map(({ group, rows }) => (
        <DiwanSection
          description={t(`groups.${group}.lede`)}
          id={group}
          key={group}
          title={t(`groups.${group}.title`)}
        >
          {rows.length === 0 ? (
            <EmptyLine>{t("none")}</EmptyLine>
          ) : (
            <RowList>
              {rows.map((row) => (
                <PlaceRow
                  group={group}
                  key={row.id}
                  locale={locale}
                  row={row}
                />
              ))}
            </RowList>
          )}
        </DiwanSection>
      ))}
      <DiwanSection
        description={t("groups.audition.lede")}
        id="auditions"
        title={t("groups.audition.title")}
      >
        <Link className="link justify-self-start" href="/company">
          {t("groups.audition.link")}
        </Link>
      </DiwanSection>
    </>
  );
};

type Place = Awaited<ReturnType<typeof programmes.openPlaces>>[number];

const PlaceRow = ({
  group,
  locale,
  row,
}: {
  group: Group;
  locale: Locale;
  row: Place;
}) => {
  const t = useTranslations("nexus.getInvolved");
  // Who it is with: the partner, the program, or the Society.
  const partner = row.partner_name_en
    ? localized(
        { name_ar: row.partner_name_ar, name_en: row.partner_name_en },
        "name",
        locale
      )
    : null;
  const program = row.programme_name_en
    ? localized(
        { name_ar: row.programme_name_ar, name_en: row.programme_name_en },
        "name",
        locale
      )
    : null;
  const where = (group === "partner" ? partner : program) ?? t("society");
  return (
    <li className="grid gap-1 py-4">
      <p className="font-medium">{localized(row, "title", locale)}</p>
      <p className="type-caption">
        {where}
        {row.closes_at
          ? ` · ${t("closes", { date: formatLongDate(row.closes_at, locale) })}`
          : ""}
      </p>
      {localized(row, "body", locale) ? (
        <p className="type-body whitespace-pre-line" dir="auto">
          {localized(row, "body", locale)}
        </p>
      ) : null}
    </li>
  );
};
