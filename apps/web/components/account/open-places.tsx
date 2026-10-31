"use client";

import { useAuth } from "@repo/auth/provider";
import type { Locale } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { localized, programmes } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { RowList } from "@/components/nexus/page";
import {
  EmptyLine,
  ErrorState,
  SectionSpinner,
} from "@/components/nexus/states";

/**
 * Every open opportunity, for anyone to read, in one list (owner, Oct 31,
 * 2026: Get involved has no sections): roles, the Apprenticeship (the
 * internship), First Ink, volunteering, places with partners and the
 * Company's auditions, soonest first. Each says what it is, who it is
 * with and when it closes. Replying takes membership.
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
  if (places.data.length === 0) {
    return <EmptyLine>{t("none")}</EmptyLine>;
  }
  return (
    <RowList>
      {places.data.map((row) => (
        <PlaceRow key={row.id} locale={locale} row={row} />
      ))}
    </RowList>
  );
};

type Place = Awaited<ReturnType<typeof programmes.openPlaces>>[number];

const KINDS = [
  "role",
  "apprenticeship",
  "first_ink",
  "volunteer",
  "partner",
  "audition",
] as const;

const PlaceRow = ({ locale, row }: { locale: Locale; row: Place }) => {
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
  const kind = KINDS.find((k) => k === row.kind) ?? "role";
  const where = (kind === "partner" ? partner : program) ?? t("society");
  let when: string | null = null;
  if (kind === "audition" && row.closes_at) {
    when = t("on", {
      date: formatLongDate(row.closes_at, locale),
      time: formatClock(row.closes_at, locale),
    });
  } else if (row.closes_at) {
    when = t("closes", { date: formatLongDate(row.closes_at, locale) });
  }
  return (
    <li className="grid gap-1 py-4">
      <p className="font-medium">
        {kind === "audition" ? (
          <Link className="hover:underline" href="/company/auditions">
            {t("audition", { title: localized(row, "title", locale) })}
          </Link>
        ) : (
          localized(row, "title", locale)
        )}
      </p>
      <p className="type-caption">
        {[t(`kinds.${kind}`), where, when].filter(Boolean).join(" · ")}
      </p>
      {localized(row, "body", locale) ? (
        <p className="type-body whitespace-pre-line" dir="auto">
          {localized(row, "body", locale)}
        </p>
      ) : null}
    </li>
  );
};
