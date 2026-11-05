"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { Textarea } from "@repo/brand/components/ui/textarea";
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
import { useGrants } from "@/lib/diwan/queries";
import { EmptyLine, SectionSpinner } from "../states";
import { AddInPlace, ConfirmAction, ErrorLine, Field, SaveButton } from "./kit";

const key = ["admin", "needs"];

type Outcome = "provided" | "partly_provided" | "not_provided";

interface Need {
  id: string;
  item: string;
  needed_by: string;
  /** Where the need is from: Qirtas's row, or the event's title. */
  programme: { name_ar: string; name_en: string } | null;
  programme_id: string | null;
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
  const t = useTranslations("diwan.admin.needs");
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
  const t = useTranslations("diwan.admin.needs");
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

/** Whose list a need is on: an event's (owner, Nov 5, 2026) or Qirtas's row. */
type NeedOwner =
  | { readonly column: "event_id"; readonly id: string }
  | { readonly column: "programme_id"; readonly id: string };

export const NewNeed = ({
  onDone,
  owner,
}: {
  /** Called once saved: closes the form in place. */
  readonly onDone: () => void;
  readonly owner: NeedOwner;
}) => {
  const t = useTranslations("diwan.admin.needs");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    item: "",
    needed_by: "",
    purpose: "",
    quantity: "1",
  });
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("needs")
          .insert({
            item: form.item.trim(),
            needed_by: form.needed_by,
            ...(owner.column === "event_id"
              ? { event_id: owner.id }
              : { programme_id: owner.id }),
            purpose: form.purpose.trim(),
            quantity: Number(form.quantity),
          })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key });
      onDone();
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
 * A needs list (owner, Oct 30, 2026): what an event or Qirtas needs from
 * Student Life (item, quantity, date needed, purpose), never a cost. With
 * neither, every list: the General Secretary's log of requests to Student
 * Life.
 */
export const Needs = ({
  eventId,
  programmeId,
}: {
  readonly eventId?: string;
  readonly programmeId?: string;
}) => {
  let owner: NeedOwner | null = null;
  if (eventId) {
    owner = { column: "event_id", id: eventId };
  } else if (programmeId) {
    owner = { column: "programme_id", id: programmeId };
  }
  const t = useTranslations("diwan.admin.needs");
  const { supabase } = useAuth();
  const grants = useGrants();
  const needs = useQuery({
    queryFn: async () => {
      let query = supabase
        .schema("programmes")
        .from("needs")
        .select(
          "id, item, quantity, needed_by, purpose, status, requested_on, provided_on, provided_note, programme_id, event_id"
        )
        .order("needed_by");
      if (owner) {
        query = query.eq(owner.column, owner.id);
      }
      const rows = unwrap(await query) ?? [];
      // The programs live in another schema (core), which the Data API
      // can't embed across; read their names beside the needs.
      const ids = [
        ...new Set(
          rows.flatMap((r) => (r.programme_id ? [r.programme_id] : []))
        ),
      ];
      const programmes = ids.length
        ? (unwrap(
            await supabase
              .schema("core")
              .from("programmes")
              .select("id, name_en, name_ar, slug")
              .in("id", ids)
          ) ?? [])
        : [];
      const eventIds = [
        ...new Set(rows.flatMap((r) => (r.event_id ? [r.event_id] : []))),
      ];
      const eventRows = eventIds.length
        ? (unwrap(
            await supabase
              .schema("events")
              .from("events")
              .select("id, title_en, title_ar")
              .in("id", eventIds)
          ) ?? [])
        : [];
      return rows.map((r) => {
        const event = eventRows.find((e) => e.id === r.event_id);
        return {
          ...r,
          programme:
            programmes.find((p) => p.id === r.programme_id) ??
            (event
              ? { name_ar: event.title_ar ?? "", name_en: event.title_en ?? "" }
              : null),
        };
      }) as Need[];
    },
    queryKey: [...key, owner?.id ?? "all"],
  });
  const canRequest = hasPermission(grants.data, "governance.manage");

  return (
    <div className="grid gap-6">
      <p className="type-body max-w-[60ch]">
        {owner ? t("lede") : t("logLede")}
      </p>
      {needs.isPending ? <SectionSpinner /> : null}
      {needs.data?.length === 0 ? <EmptyLine>{t("empty")}</EmptyLine> : null}
      <ul className="grid">
        {needs.data?.map((need) => (
          <NeedRow
            canRequest={canRequest}
            key={need.id}
            need={need}
            showProgram={!owner}
          />
        ))}
      </ul>
      {owner ? (
        <AddInPlace label={t("new")}>
          {(close) => <NewNeed onDone={close} owner={owner} />}
        </AddInPlace>
      ) : null}
    </div>
  );
};
