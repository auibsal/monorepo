"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { hasPermission } from "@repo/rbac";
import { localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { DateInput } from "@/components/fields/date-input";
import { useGrants } from "@/lib/nexus/queries";
import { EmptyLine, SectionSpinner } from "../states";
import { ConfirmAction, ErrorLine, Field, SaveButton } from "./kit";

const key = ["admin", "needs"];

type Outcome = "provided" | "partly_provided" | "not_provided";

interface Need {
  id: string;
  item: string;
  needed_by: string;
  programme: { name_ar: string; name_en: string; slug: string } | null;
  programme_id: string;
  provided_note: string | null;
  provided_on: string | null;
  purpose: string;
  quantity: number;
  requested_on: string | null;
  status: "listed" | "requested" | Outcome;
}

const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(
    new Date()
  );

/** The General Secretary records the request and what Student Life gave. */
const RequestActions = ({ need }: { readonly need: Need }) => {
  const t = useTranslations("nexus.admin.needs");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [note, setNote] = useState(need.provided_note ?? "");
  const move = useMutation({
    mutationFn: async (status: Need["status"]) =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("needs")
          .update(
            status === "requested"
              ? { requested_on: today(), status }
              : {
                  provided_note: note.trim() || null,
                  provided_on: status === "not_provided" ? null : today(),
                  status,
                }
          )
          .eq("id", need.id)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  if (need.status === "listed") {
    return (
      <div className="grid gap-2">
        <Button
          className="justify-self-start"
          disabled={move.isPending}
          onClick={() => move.mutate("requested")}
          variant="outline"
        >
          {t("markRequested")}
        </Button>
        <ErrorLine error={move.error} />
      </div>
    );
  }
  if (need.status !== "requested") {
    return null;
  }
  return (
    <div className="grid max-w-xl gap-2">
      <Field label={t("providedNote")}>
        {(id) => (
          <Input
            id={id}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            value={note}
          />
        )}
      </Field>
      <div className="flex flex-wrap gap-2">
        {(["provided", "partly_provided", "not_provided"] as const).map(
          (status) => (
            <Button
              disabled={move.isPending}
              key={status}
              onClick={() => move.mutate(status)}
              variant="outline"
            >
              {t(`mark.${status}`)}
            </Button>
          )
        )}
      </div>
      <ErrorLine error={move.error} />
    </div>
  );
};

const NeedRow = ({
  canRequest,
  need,
  showProgram,
}: {
  readonly canRequest: boolean;
  readonly need: Need;
  readonly showProgram: boolean;
}) => {
  const t = useTranslations("nexus.admin.needs");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("needs")
          .delete()
          .eq("id", need.id)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const facts = [
    t("quantity", { count: formatNumber(need.quantity, locale) }),
    t("neededBy", { date: formatLongDate(need.needed_by, locale) }),
    showProgram && need.programme
      ? localized(need.programme, "name", locale)
      : null,
  ].filter(Boolean);

  return (
    <li className="grid gap-2 border-line border-t py-space-4">
      <p className="type-subheading">{need.item}</p>
      <p className="type-caption">{facts.join(" · ")}</p>
      <p className="type-body">{need.purpose}</p>
      <p className="type-caption text-text-secondary">
        {t(`status.${need.status}`)}
        {need.requested_on
          ? ` · ${t("requestedOn", { date: formatLongDate(need.requested_on, locale) })}`
          : ""}
        {need.provided_on
          ? ` · ${t("providedOn", { date: formatLongDate(need.provided_on, locale) })}`
          : ""}
        {need.provided_note ? ` · ${need.provided_note}` : ""}
      </p>
      {canRequest ? <RequestActions need={need} /> : null}
      {need.status === "listed" || canRequest ? (
        <ConfirmAction
          confirmLabel={t("remove")}
          description={t("removeConfirm")}
          onConfirm={() => remove.mutate()}
          variant="ghost"
        >
          {t("remove")}
        </ConfirmAction>
      ) : null}
    </li>
  );
};

const NewNeed = ({ programmeId }: { readonly programmeId: string }) => {
  const t = useTranslations("nexus.admin.needs");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const blank = { item: "", needed_by: "", purpose: "", quantity: "1" };
  const [form, setForm] = useState(blank);
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("needs")
          .insert({
            item: form.item.trim(),
            needed_by: form.needed_by,
            programme_id: programmeId,
            purpose: form.purpose.trim(),
            quantity: Number(form.quantity),
          })
      ),
    onSuccess: async () => {
      setForm(blank);
      await queryClient.invalidateQueries({ queryKey: key });
    },
  });

  return (
    <form
      className="grid max-w-3xl gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        add.mutate();
      }}
    >
      <h4 className="type-subheading">{t("new")}</h4>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field className="sm:col-span-2" label={t("item")}>
          {(id) => (
            <Input
              id={id}
              maxLength={200}
              onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))}
              required
              value={form.item}
            />
          )}
        </Field>
        <Field label={t("quantityLabel")}>
          {(id) => (
            <Input
              dir="ltr"
              id={id}
              max={10_000}
              min={1}
              onChange={(e) =>
                setForm((f) => ({ ...f, quantity: e.target.value }))
              }
              required
              type="number"
              value={form.quantity}
            />
          )}
        </Field>
      </div>
      <Field label={t("neededByLabel")}>
        {(id) => (
          <DateInput
            className="max-w-xs"
            id={id}
            onChange={(e) =>
              setForm((f) => ({ ...f, needed_by: e.target.value }))
            }
            required
            value={form.needed_by}
          />
        )}
      </Field>
      <Field label={t("purpose")}>
        {(id) => (
          <Textarea
            id={id}
            maxLength={500}
            onChange={(e) =>
              setForm((f) => ({ ...f, purpose: e.target.value }))
            }
            required
            rows={3}
            value={form.purpose}
          />
        )}
      </Field>
      <SaveButton pending={add.isPending} />
      <ErrorLine error={add.error} />
    </form>
  );
};

/**
 * A needs list (owner, Oct 30, 2026): what a program or Qirtas needs from
 * Student Life (item, quantity, date needed, purpose), never a cost. With
 * no program, every list: the General Secretary's log of requests to
 * Student Life.
 */
export const Needs = ({ programmeId }: { readonly programmeId?: string }) => {
  const t = useTranslations("nexus.admin.needs");
  const { supabase } = useAuth();
  const grants = useGrants();
  const needs = useQuery({
    queryFn: async () => {
      let query = supabase
        .schema("programmes")
        .from("needs")
        .select(
          "id, item, quantity, needed_by, purpose, status, requested_on, provided_on, provided_note, programme_id, programme:programmes(name_en, name_ar, slug)"
        )
        .order("needed_by");
      if (programmeId) {
        query = query.eq("programme_id", programmeId);
      }
      return (unwrap(await query) ?? []) as unknown as Need[];
    },
    queryKey: [...key, programmeId ?? "all"],
  });
  const canRequest = hasPermission(grants.data, "governance.manage");

  return (
    <div className="grid gap-6">
      <p className="type-body max-w-[60ch]">
        {programmeId ? t("lede") : t("logLede")}
      </p>
      {needs.isPending ? <SectionSpinner /> : null}
      {needs.data?.length === 0 ? <EmptyLine>{t("empty")}</EmptyLine> : null}
      <ul className="grid">
        {needs.data?.map((need) => (
          <NeedRow
            canRequest={canRequest}
            key={need.id}
            need={need}
            showProgram={!programmeId}
          />
        ))}
      </ul>
      {programmeId ? <NewNeed programmeId={programmeId} /> : null}
    </div>
  );
};
