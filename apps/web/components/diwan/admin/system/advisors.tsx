"use client";

import { SalCard } from "@repo/brand/components/sal/card";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";

const CHECKS = [
  "rls_disabled",
  "definer_exposed",
  "search_path",
  "multiple_policies",
  "unindexed_foreign_key",
] as const;
type Check = (typeof CHECKS)[number];

/**
 * The monthly look at the advisors (decisions.md, Platform): the checks CI
 * holds at zero, run live against the database, for whoever keeps the
 * platform. Supabase's own Advisors list the rest (sign-in settings).
 */
export const AdvisorFindings = () => {
  const t = useTranslations("diwan.admin.settings.advisors");
  const { supabase } = useAuth();
  const findings = useQuery({
    queryFn: async () =>
      unwrap(await supabase.schema("core").rpc("advisor_findings")) ?? [],
    queryKey: ["admin", "advisor-findings"],
  });
  const rows = findings.data ?? [];
  return (
    <SalCard>
      <h2 className="type-subheading">{t("title")}</h2>
      <p className="type-body">{t("lede")}</p>
      {findings.isSuccess && rows.length === 0 ? (
        <p className="type-caption" role="status">
          {t("clean")}
        </p>
      ) : null}
      {rows.length > 0 ? (
        <ul className="grid gap-1">
          {rows.map((row) => (
            <li className="type-caption" key={`${row.check_key}-${row.item}`}>
              {`${t(`checks.${(CHECKS.find((c) => c === row.check_key) ?? "rls_disabled") as Check}`)}: ${row.item}`}
            </li>
          ))}
        </ul>
      ) : null}
    </SalCard>
  );
};
