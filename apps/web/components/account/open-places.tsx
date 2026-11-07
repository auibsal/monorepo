"use client";

import { useAuth } from "@repo/auth/provider";
import type { Locale } from "@repo/internationalization";
import {
  formatClock,
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { localized, programmes } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { RowList } from "@/components/diwan/page";
import {
  EmptyLine,
  ErrorState,
  SectionSpinner,
} from "@/components/diwan/states";

/**
 * Every open role, for anyone to read, in one list (decisions.md:
 * open roles only): team roles, event teams, Qalam mentors and the
 * Company's auditions, soonest first. Each says what it is, where and when
 * it closes. Replying takes membership.
 */
export const OpenPlaces = () => {
  const t = useTranslations("diwan.getInvolved");
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

const KINDS = ["role", "event_team", "qalam_mentor", "audition"] as const;

const PlaceRow = ({ locale, row }: { locale: Locale; row: Place }) => {
  const t = useTranslations("diwan.getInvolved");
  const td = useTranslations("diwan.details");
  const kind = KINDS.find((k) => k === row.kind) ?? "role";
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
        ) : null}
        {kind === "event_team" && row.event_slug ? (
          <Link className="hover:underline" href={`/events/${row.event_slug}`}>
            {localized(row, "title", locale)}
          </Link>
        ) : null}
        {kind === "audition" || (kind === "event_team" && row.event_slug)
          ? null
          : localized(row, "title", locale)}
      </p>
      <p className="type-caption">
        {[t(`kinds.${kind}`), when].filter(Boolean).join(" · ")}
      </p>
      {localized(row, "body", locale) ? (
        <p className="type-body whitespace-pre-line" dir="auto">
          {localized(row, "body", locale)}
        </p>
      ) : null}
      {/* What a reader weighs before replying: how many places and the
          skills it wants. */}
      {row.places > 1 || row.skills.length > 0 ? (
        <p className="type-caption text-text-secondary">
          {[
            row.places > 1
              ? t("places", {
                  count: row.places,
                  n: formatNumber(row.places),
                })
              : null,
            row.skills.length > 0
              ? t("skills", {
                  skills: row.skills
                    .map((skill) => td(`skills.${skill}` as never))
                    .join(", "),
                })
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}
    </li>
  );
};
