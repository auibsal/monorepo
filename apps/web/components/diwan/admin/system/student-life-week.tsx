"use client";

import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { localized, unwrap } from "@/lib/data";
import { RowList } from "../../page";

interface WeekRow {
  event: { title_ar: string; title_en: string } | null;
  included: boolean | null;
}

/**
 * Student Life's weekly email (decisions.md, Events): the latest week
 * sent, and which events they marked as included. Nothing shows before the
 * first email.
 */
export const StudentLifeWeekPanel = () => {
  const t = useTranslations("diwan.admin.overview.studentLife");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const week = useQuery({
    queryFn: async () => {
      const latest = unwrap(
        await supabase
          .schema("events")
          .from("student_life_weeks")
          .select("id, week_of, sent_at")
          .not("sent_at", "is", null)
          .order("week_of", { ascending: false })
          .limit(1)
          .maybeSingle()
      );
      if (!latest) {
        return null;
      }
      const rows = (unwrap(
        await supabase
          .schema("events")
          .from("student_life_week_events")
          .select("included, event:events(title_en, title_ar)")
          .eq("week_id", latest.id)
      ) ?? []) as unknown as WeekRow[];
      return { ...latest, rows };
    },
    queryKey: ["admin", "student-life-week"],
  });
  if (!week.data) {
    return null;
  }
  const state = (included: boolean | null) => {
    if (included === null) {
      return t("waiting");
    }
    return included ? t("included") : t("notIncluded");
  };
  return (
    <div className="grid gap-3">
      <p className="type-body">
        {t("sent", { week: formatLongDate(week.data.week_of, locale) })}
      </p>
      <RowList>
        {week.data.rows.map((r) => (
          <li
            className="flex flex-wrap justify-between gap-2"
            key={`${r.event?.title_en}`}
          >
            <span>{r.event ? localized(r.event, "title", locale) : ""}</span>
            <span className="type-caption">{state(r.included)}</span>
          </li>
        ))}
      </RowList>
    </div>
  );
};
