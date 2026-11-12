"use client";

import type { Locale } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { RowList } from "../../page";
import { SectionSpinner } from "../../states";

const SINCE_DAYS = 14;

interface StaffAlert {
  created_at: string;
  id: string;
  link: string | null;
  team: string;
  text_ar: string;
  text_en: string;
  urgent: boolean;
}

/**
 * The staff alerts of the last two weeks, the same lines Hudhud posts to
 * the Diwan group's team topics (urgent at once, the rest at 8:00 a.m.).
 * No names in them: what happened and where to look.
 */
export const StaffAlerts = () => {
  const t = useTranslations("diwan.admin.overview.alerts");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const alerts = useQuery({
    queryFn: async () => {
      const since = new Date(Date.now() - SINCE_DAYS * 864e5).toISOString();
      return (unwrap(
        await supabase
          .schema("core")
          .from("staff_alerts")
          .select("id, team, urgent, text_en, text_ar, link, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(20)
      ) ?? []) as StaffAlert[];
    },
    queryKey: ["admin", "staff-alerts"],
  });
  if (alerts.isPending) {
    return <SectionSpinner />;
  }
  if (!alerts.data?.length) {
    return <p className="type-body text-text-secondary">{t("none")}</p>;
  }
  return (
    <RowList>
      {alerts.data.map((a) => (
        <li className="grid gap-1" key={a.id}>
          <p className="type-label">
            {a.urgent ? `${t("urgent")} · ` : ""}
            {t(`teams.${a.team as "council"}`)}
          </p>
          <p className="type-body">{locale === "ar" ? a.text_ar : a.text_en}</p>
          <p className="type-caption">
            {formatLongDate(a.created_at, locale)} ·{" "}
            {formatClock(a.created_at, locale)}
            {a.link ? (
              <>
                {" · "}
                <a className="link" href={a.link}>
                  {t("open")}
                </a>
              </>
            ) : null}
          </p>
        </li>
      ))}
    </RowList>
  );
};
