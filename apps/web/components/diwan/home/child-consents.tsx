"use client";

import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { InlineConfirm } from "@/components/frame/inline-confirm";
import { useAuth } from "@/lib/auth/provider";
import { localized, unwrap } from "@/lib/data";
import { ErrorLine } from "../admin/kit";
import { DiwanSection, RowList } from "../page";

const KEY = ["governance", "children-consents"];

/**
 * A parent's view (decisions.md, Members: Parents): the consents signed
 * for their child, each withdrawn for the future in place. Withdrawing the
 * consent to membership puts the child's limits back. Shown only to a
 * holder of the Parent role.
 */
export const ChildConsents = () => {
  const t = useTranslations("diwan.accountHome.children");
  const td = useTranslations("diwan.forms.defs");
  const locale = useLocale() as Locale;
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const consents = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(await supabase.schema("governance").rpc("my_children_consents")) ??
      [],
    queryKey: [...KEY, user?.id ?? ""],
  });
  const withdraw = useMutation({
    mutationFn: async (submissionId: string) =>
      unwrap(
        await supabase
          .schema("governance")
          .rpc("parent_withdraw_consent", { submission_id: submissionId })
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
  const rows = consents.data ?? [];
  if (rows.length === 0) {
    return null;
  }
  return (
    <DiwanSection id="children" title={t("title")}>
      <RowList>
        {rows.map((row) => (
          <li className="grid gap-1" key={row.submission_id}>
            <p className="font-medium">
              {td(`${row.form_key}.title` as Parameters<typeof td>[0])}
            </p>
            <p className="type-caption">
              {t(row.withdrawn_at ? "withdrawnLine" : "signedLine", {
                date: formatLongDate(
                  row.withdrawn_at ?? row.signed_at ?? "",
                  locale
                ),
                name: localized(
                  {
                    name_ar: row.child_name_ar,
                    name_en: row.child_name_en ?? "",
                  },
                  "name",
                  locale
                ),
              })}
            </p>
            {row.withdrawn_at ? null : (
              <InlineConfirm
                confirm={t("withdraw")}
                disabled={withdraw.isPending}
                label={t("withdraw")}
                onConfirm={() => withdraw.mutate(row.submission_id)}
                question={t("withdrawAsk")}
              />
            )}
          </li>
        ))}
      </RowList>
      <ErrorLine error={withdraw.error} />
    </DiwanSection>
  );
};
