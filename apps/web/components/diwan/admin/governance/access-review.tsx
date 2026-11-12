"use client";

import { Field } from "@repo/brand/components/sal/field";
import { Input } from "@repo/brand/components/ui/input";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { useGrants } from "@/lib/diwan/queries";
import { hasPermission } from "@/lib/rbac";
import { AddInPlace, ErrorLine, SaveButton } from "../kit";

const key = ["admin", "access-reviews"];

/**
 * The quarterly access review (decisions.md, Get involved and roles): the
 * Secretary checks who holds what against the manuals each quarter
 * and records it here. The last review shows, and a quarter without one says
 * so.
 */
export const AccessReview = () => {
  const t = useTranslations("diwan.admin.governance.accessReview");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const grants = useGrants();
  const canRecord =
    hasPermission(grants.data, "governance.manage") ||
    hasPermission(grants.data, "roles.assign");
  const reviews = useQuery({
    enabled: canRecord,
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("access")
          .from("access_reviews")
          .select("id, reviewed_at, holders, note")
          .order("reviewed_at", { ascending: false })
          .limit(1)
      ) ?? [],
    queryKey: key,
  });
  const [note, setNote] = useState("");
  const record = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("access")
          .rpc("record_access_review", { note: note || undefined })
      ),
    onSuccess: async () => {
      setNote("");
      await queryClient.invalidateQueries({ queryKey: key });
    },
  });
  if (!canRecord) {
    return null;
  }
  const last = reviews.data?.[0];
  const due =
    !last ||
    Date.parse(last.reviewed_at) < Date.now() - 92 * 24 * 60 * 60 * 1000;
  return (
    <section aria-labelledby="access-review" className="grid gap-3">
      <h2 className="text-lg font-light" id="access-review">
        {t("title")}
      </h2>
      <p className="text-text-secondary max-w-prose">
        {last
          ? t("last", {
              date: formatLongDate(last.reviewed_at, locale),
              holders: String(last.holders),
            })
          : t("never")}
        {due ? ` ${t("due")}` : ""}
      </p>
      <AddInPlace label={t("record")}>
        {(close) => (
          <form
            className="grid gap-3"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              record.mutate(undefined, { onSuccess: close });
            }}
          >
            <Field label={t("note")}>
              {(id) => (
                <Input
                  id={id}
                  maxLength={2000}
                  onChange={(e) => setNote(e.target.value)}
                  value={note}
                />
              )}
            </Field>
            <SaveButton pending={record.isPending} />
            <ErrorLine error={record.error} />
          </form>
        )}
      </AddInPlace>
    </section>
  );
};
