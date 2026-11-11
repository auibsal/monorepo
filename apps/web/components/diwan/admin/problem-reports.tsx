"use client";

import { Button } from "@repo/brand/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatDateTime } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { useGrants } from "@/lib/diwan/queries";
import { hasPermissionAnywhere } from "@/lib/rbac";
import { DiwanSection } from "../page";
import { EmptyLine } from "../states";

const KEY = ["admin", "problem-reports"];

/**
 * "Report a problem" reaches the web lead here (decisions.md, The site):
 * the open reports, newest first, each closed as fixed or not to be fixed.
 * Only whoever holds settings.manage reads them (RLS).
 */
export const ProblemReports = () => {
  const t = useTranslations("diwan.report.admin");
  const locale = useLocale() as Locale;
  const { supabase, user } = useAuth();
  const grants = useGrants();
  const queryClient = useQueryClient();
  const allowed = hasPermissionAnywhere(grants.data, "settings.manage");
  const reports = useQuery({
    enabled: allowed,
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("core")
          .from("problem_reports")
          .select("id, page, message, reply_to, user_id, created_at")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(50)
      ) ?? [],
    queryKey: KEY,
  });
  const close = useMutation({
    mutationFn: async (input: { id: string; status: "fixed" | "closed" }) =>
      unwrap(
        await supabase
          .schema("core")
          .from("problem_reports")
          .update({
            handled_at: new Date().toISOString(),
            handled_by: user?.id ?? null,
            status: input.status,
          })
          .eq("id", input.id)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
  if (!allowed) {
    return null;
  }
  const rows = reports.data ?? [];
  return (
    <DiwanSection description={t("lede")} id="problems" title={t("title")}>
      {reports.isSuccess && rows.length === 0 ? (
        <EmptyLine>{t("empty")}</EmptyLine>
      ) : null}
      <ul className="border-line grid border-b">
        {rows.map((report) => (
          <li className="border-line grid gap-2 border-t py-3" key={report.id}>
            <p className="type-caption">
              <bdi dir="ltr">{report.page}</bdi> ·{" "}
              {formatDateTime(report.created_at, locale)}
              {report.user_id ? ` · ${t("member")}` : ""}
              {report.reply_to ? (
                <>
                  {" · "}
                  <bdi dir="ltr">{report.reply_to}</bdi>
                </>
              ) : null}
            </p>
            <p className="type-body whitespace-pre-wrap">{report.message}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <Button
                disabled={close.isPending}
                onClick={() => close.mutate({ id: report.id, status: "fixed" })}
                size="sm"
                variant="outline"
              >
                {t("fixed")}
              </Button>
              <Button
                disabled={close.isPending}
                onClick={() =>
                  close.mutate({ id: report.id, status: "closed" })
                }
                size="sm"
                variant="link"
              >
                {t("close")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </DiwanSection>
  );
};
