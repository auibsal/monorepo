"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { formatLongDate } from "@repo/internationalization/format";
import { unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ErrorLine } from "../kit";

const key = ["admin", "membership", "associate-requests"];

/**
 * Requests for Associate membership (decisions §2, §12), oldest first: the
 * Director of Membership approves (a named invitation goes, and any Tour
 * page taken against the request follows the account that accepts it) or
 * declines with a reason (the page is deleted).
 */
export const AssociateRequests = () => {
  const t = useTranslations("diwan.admin.associateRequests");
  const locale = useLocale();
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const requests = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("membership")
          .from("associate_requests")
          .select("id, full_name, email, relation, note, created_at")
          .eq("status", "pending")
          .order("created_at")
      ) ?? [],
    queryKey: key,
  });
  const decide = useMutation({
    mutationFn: async (input: {
      approve: boolean;
      id: string;
      why: string | null;
    }) =>
      unwrap(
        await supabase.schema("membership").rpc("decide_associate_request", {
          approve: input.approve,
          request_id: input.id,
          why: input.why ?? undefined,
        })
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return (
    <section aria-labelledby="associate-requests" className="grid gap-4">
      <h2 className="type-heading" id="associate-requests">
        {t("title")}
      </h2>
      <p className="type-body text-text-secondary">{t("lede")}</p>
      {requests.data?.length === 0 ? (
        <p className="type-caption">{t("empty")}</p>
      ) : null}
      <ul className="grid divide-y divide-line">
        {(requests.data ?? []).map((r) => (
          <li className="grid gap-2 py-3" key={r.id}>
            <p className="font-medium">
              {r.full_name} · <span dir="ltr">{r.email}</span>
            </p>
            <p className="type-caption text-text-secondary">
              {t(`relations.${r.relation as "faculty"}`)} ·{" "}
              {formatLongDate(r.created_at, locale)}
            </p>
            {r.note ? <p className="type-body">{r.note}</p> : null}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                disabled={decide.isPending}
                onClick={() =>
                  decide.mutate({ approve: true, id: r.id, why: null })
                }
                size="sm"
              >
                {t("approve")}
              </Button>
              <Input
                aria-label={t("reason")}
                className="w-64"
                onChange={(e) =>
                  setReasons((all) => ({ ...all, [r.id]: e.target.value }))
                }
                placeholder={t("reason")}
                value={reasons[r.id] ?? ""}
              />
              <Button
                disabled={decide.isPending || !reasons[r.id]?.trim()}
                onClick={() =>
                  decide.mutate({
                    approve: false,
                    id: r.id,
                    why: reasons[r.id]?.trim() ?? null,
                  })
                }
                size="sm"
                variant="ghost"
              >
                {t("decline")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <ErrorLine error={decide.error ?? requests.error} />
    </section>
  );
};
