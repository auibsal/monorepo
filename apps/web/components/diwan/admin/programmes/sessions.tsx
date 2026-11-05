"use client";

import { useAuth } from "@repo/auth/provider";
import type { Locale } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { localized, unwrap } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/diwan/navigation";
import { RowList } from "../../page";
import { EmptyLine, ErrorState, SectionSpinner } from "../../states";

/**
 * A series' events (owner, Nov 5, 2026: no programs and no repeat rules;
 * the term calendar is plain events). Each is a dated event the President
 * or the series' event lead adds and edits in What's on.
 */
export const Sessions = ({ programmeId }: { programmeId: string }) => {
  const t = useTranslations("diwan.admin.programmes.sessions");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const events = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .from("events")
          .select("id, slug, title_en, title_ar, starts_at, status")
          .eq("programme_id", programmeId)
          .gte("starts_at", new Date(Date.now() - 864e5 * 180).toISOString())
          .order("starts_at")
      ) ?? [],
    queryKey: ["admin", "series-events", programmeId],
  });
  if (events.isPending) {
    return <SectionSpinner />;
  }
  if (events.isError) {
    return <ErrorState onRetry={() => events.refetch()} />;
  }
  return (
    <div className="grid max-w-3xl gap-6">
      <p className="type-body text-text-secondary">{t("lede")}</p>
      {events.data.length === 0 ? (
        <EmptyLine action={{ href: "/events/new", label: t("add") }}>
          {t("none")}
        </EmptyLine>
      ) : (
        <RowList>
          {events.data.map((e) => (
            <li className="grid gap-1" key={e.id}>
              <Link className="link" href={`/events/${e.slug ?? e.id}`}>
                {localized(e, "title", locale)}
              </Link>
              <span className="type-caption text-text-secondary">
                {formatLongDate(e.starts_at, locale)},{" "}
                {formatClock(e.starts_at, locale)}
                {e.status === "draft" ? ` · ${t("draft")}` : ""}
              </span>
            </li>
          ))}
        </RowList>
      )}
    </div>
  );
};
