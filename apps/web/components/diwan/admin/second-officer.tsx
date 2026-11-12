"use client";

import { Button } from "@repo/brand/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import { useAuth } from "@/lib/auth/provider";
import { localized, unwrap } from "@/lib/data";
import { DiwanSection, RowList } from "../page";
import { ErrorLine } from "./kit";
import { useMemberNames } from "./member-picker";
import { memberName } from "./members/directory";

type Kind =
  | "council_role"
  | "legal_name"
  | "member_removal"
  | "student_life_export";

interface Action {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  requested_at: string;
  requested_by: string;
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** What the request changes, in a few words. */
const useDetail = () => {
  const locale = useLocale();
  const { supabase } = useAuth();
  const roles = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("access")
          .from("roles")
          .select("key, name_en, name_ar")
      ) ?? [],
    queryKey: ["admin", "role-names"],
  });
  return (a: Action) => {
    const p = a.payload;
    if (a.kind === "council_role") {
      const role = roles.data?.find((r) => r.key === p.role_key);
      return role
        ? localized(role, "name", locale as Locale)
        : text(p.role_key);
    }
    if (a.kind === "legal_name") {
      const parts =
        locale === "ar"
          ? [p.first_ar, p.father_ar, p.grandfather_ar, p.last_ar]
          : [p.first_en, p.father_en, p.grandfather_en, p.last_en];
      return parts.map(text).filter(Boolean).join(" ");
    }
    if (a.kind === "member_removal") {
      return text(p.reason);
    }
    return text(p.name);
  };
};

/**
 * Actions that take two officers (decisions.md): a Council role, a legal
 * name corrected, a list sent to Student Life. Whoever asked waits; another
 * officer holding the permission approves or declines here.
 */
export const SecondOfficer = () => {
  const t = useTranslations("diwan.admin.overview.secondOfficer");
  const locale = useLocale() as Locale;
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const actions = useQuery({
    queryFn: async () =>
      (unwrap(
        await supabase
          .schema("governance")
          .from("pending_actions")
          .select("id, kind, payload, requested_at, requested_by")
          .eq("status", "pending")
          .order("requested_at")
      ) ?? []) as Action[],
    queryKey: ["admin", "pending-actions"],
  });
  const rows = actions.data ?? [];
  const names = useMemberNames(
    rows.flatMap((a) => [
      a.requested_by,
      text(a.payload.target_user) || text(a.payload.member),
    ])
  );
  const detail = useDetail();
  const decide = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) =>
      unwrap(
        await supabase
          .schema("governance")
          .rpc("decide_action", { action_id: id, approve })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });

  if (rows.length === 0) {
    return null;
  }
  const nameOf = (id: string) => {
    const row = names.data?.find((n) => n.id === id);
    return row ? memberName(row, locale) : "";
  };

  return (
    <DiwanSection id="second-officer" title={t("title")}>
      <p className="type-body max-w-[60ch]">{t("lede")}</p>
      <RowList>
        {rows.map((a) => {
          const subject = nameOf(
            text(a.payload.target_user) || text(a.payload.member)
          );
          const mine = a.requested_by === user?.id;
          return (
            <li className="grid gap-2" key={a.id}>
              <p className="font-medium">
                {t(`kinds.${a.kind as Kind}`, { detail: detail(a), subject })}
              </p>
              <p className="type-caption">
                {t("asked", {
                  date: formatLongDate(a.requested_at, locale),
                  name: nameOf(a.requested_by),
                })}
              </p>
              {mine ? (
                <p className="type-caption">{t("yours")}</p>
              ) : (
                <div className="flex flex-wrap gap-4">
                  <Button
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ approve: true, id: a.id })}
                    size="sm"
                    variant="outline"
                  >
                    {t("approve")}
                  </Button>
                  <Button
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ approve: false, id: a.id })}
                    size="sm"
                    variant="link"
                  >
                    {t("decline")}
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </RowList>
      <ErrorLine error={decide.error} />
    </DiwanSection>
  );
};
