"use client";

import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { localized, unwrap } from "@/lib/data";
import { DiwanSection, RowList } from "../../page";
import { EmptyLine } from "../../states";
import {
  AddInPlace,
  BilingualField,
  ErrorLine,
  Field,
  SaveButton,
} from "../kit";
import { EditableSection } from "../record";

const PHASES = ["before", "night", "after"] as const;
type Phase = (typeof PHASES)[number];

/**
 * The event's checklist (SAL-EVT-01, section 9): before, on the night and
 * after, from its preset and the accessible-event and green-event
 * checklists every event carries. Ticked here; what the site can see for
 * itself is never typed.
 */
export const EventChecklist = ({ eventId }: { readonly eventId: string }) => {
  const t = useTranslations("diwan.admin.event.checklist");
  const locale = useLocale() as Locale;
  const { supabase, user } = useAuth();
  const client = useQueryClient();
  const key = ["admin", "event-checklist", eventId];
  const items = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("api")
          .from("checklist_items")
          .select("id, phase, source, label_en, label_ar, done_at")
          .eq("event_id", eventId)
          .order("sort")
      ) ?? [],
    queryKey: key,
  });
  const tick = useMutation({
    mutationFn: async ({ done, id }: { done: boolean; id: string }) =>
      unwrap(
        await supabase
          .schema("api")
          .from("checklist_items")
          .update(
            done
              ? { done_at: new Date().toISOString(), done_by: user?.id ?? null }
              : { done_at: null, done_by: null }
          )
          .eq("id", id)
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
  const rows = items.data ?? [];
  const ticked = rows.filter((r) => r.done_at).length;
  return (
    <DiwanSection
      description={
        rows.length > 0
          ? t("progress", {
              done: formatNumber(ticked),
              total: formatNumber(rows.length),
            })
          : undefined
      }
      id="checklist"
      title={t("title")}
    >
      {rows.length === 0 && items.data ? (
        <EmptyLine>{t("empty")}</EmptyLine>
      ) : null}
      {PHASES.map((phase) => {
        const inPhase = rows.filter((r) => r.phase === phase);
        if (inPhase.length === 0) {
          return null;
        }
        return (
          <div className="grid gap-2" key={phase}>
            <h3 className="type-label">{t(`phases.${phase}`)}</h3>
            <ul className="grid gap-2">
              {inPhase.map((item) => (
                <li className="flex items-start gap-3" key={item.id}>
                  <Checkbox
                    checked={Boolean(item.done_at)}
                    id={`check-${item.id}`}
                    onCheckedChange={(v) =>
                      tick.mutate({ done: v === true, id: item.id })
                    }
                  />
                  <Label
                    className="leading-normal font-normal"
                    htmlFor={`check-${item.id}`}
                  >
                    {localized(item, "label", locale)}
                    {item.source === "access" || item.source === "green" ? (
                      <span className="type-caption ms-2">
                        {t(`sources.${item.source}`)}
                      </span>
                    ) : null}
                  </Label>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <AddInPlace label={t("add")}>
        {(close) => <AddItem close={close} eventId={eventId} />}
      </AddInPlace>
      <ErrorLine error={tick.error} />
    </DiwanSection>
  );
};

const AddItem = ({
  close,
  eventId,
}: {
  readonly close: () => void;
  readonly eventId: string;
}) => {
  const t = useTranslations("diwan.admin.event.checklist");
  const { supabase } = useAuth();
  const client = useQueryClient();
  const [phase, setPhase] = useState<Phase>("before");
  const [label, setLabel] = useState({ ar: "", en: "" });
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("api")
          .from("checklist_items")
          .insert({
            event_id: eventId,
            label_ar: label.ar || label.en,
            label_en: label.en || label.ar,
            phase,
            sort: 1000,
            source: "own",
          })
      ),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: ["admin", "event-checklist", eventId],
      });
      close();
    },
  });
  return (
    <form
      className="grid gap-4"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        add.mutate();
      }}
    >
      <fieldset className="grid gap-2">
        <legend className="type-label mb-2">{t("when")}</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {PHASES.map((p) => (
            <label className="flex items-center gap-2" key={p}>
              <input
                checked={phase === p}
                name="phase"
                onChange={() => setPhase(p)}
                type="radio"
              />
              {t(`phases.${p}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <BilingualField
        label={t("item")}
        maxLength={300}
        onChange={setLabel}
        required
        value={label}
      />
      <SaveButton pending={add.isPending} success={add.isSuccess} />
      <ErrorLine error={add.error} />
    </form>
  );
};

interface Step {
  readonly ar: string;
  readonly en: string;
  readonly minutes: number;
}

const asSteps = (value: unknown): Step[] =>
  Array.isArray(value) ? (value as Step[]) : [];

/**
 * The run of show: the event's parts in order with their minutes, from its
 * preset (SAL-EVT-01, section 7), read as a list with Edit.
 */
export const RunOfShow = ({
  eventId,
  value,
}: {
  readonly eventId: string;
  readonly value: unknown;
}) => {
  const t = useTranslations("diwan.admin.event.runOfShow");
  const locale = useLocale() as Locale;
  const steps = asSteps(value);
  const total = steps.reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
  return (
    <EditableSection
      form={<RunOfShowForm eventId={eventId} steps={steps} />}
      id="run-of-show"
      title={t("title")}
    >
      {steps.length === 0 ? (
        <EmptyLine>{t("empty")}</EmptyLine>
      ) : (
        <>
          <RowList ordered>
            {steps.map((s, i) => (
              <li
                className="flex flex-wrap justify-between gap-x-4"
                // biome-ignore lint/suspicious/noArrayIndexKey: steps have no ids; their order is their identity
                key={i}
              >
                <span>{locale === "ar" ? s.ar || s.en : s.en || s.ar}</span>
                <span className="type-caption tabular-nums">
                  {t("minutes", { count: formatNumber(s.minutes) })}
                </span>
              </li>
            ))}
          </RowList>
          <p className="type-caption">
            {t("total", { count: formatNumber(total) })}
          </p>
        </>
      )}
    </EditableSection>
  );
};

const RunOfShowForm = ({
  eventId,
  steps,
}: {
  readonly eventId: string;
  readonly steps: readonly Step[];
}) => {
  const t = useTranslations("diwan.admin.event.runOfShow");
  const { supabase } = useAuth();
  const client = useQueryClient();
  const [rows, setRows] = useState<Step[]>(() =>
    steps.length > 0 ? [...steps] : [{ ar: "", en: "", minutes: 10 }]
  );
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("api")
          .from("events")
          .update({
            run_of_show: rows
              .filter((r) => r.en.trim() || r.ar.trim())
              .map(({ ar, en, minutes }) => ({ ar, en, minutes })),
          })
          .eq("id", eventId)
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: ["admin", "event"] }),
  });
  const setRow = (i: number, next: Partial<Step>) =>
    setRows((all) => all.map((r, j) => (j === i ? { ...r, ...next } : r)));
  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      {rows.map((row, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: rows have no ids yet
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem]" key={i}>
          <BilingualField
            label={t("part", { n: formatNumber(i + 1) })}
            maxLength={200}
            onChange={(v) => setRow(i, v)}
            value={{ ar: row.ar, en: row.en }}
          />
          <Field label={t("length")}>
            {(id) => (
              <Input
                id={id}
                inputMode="numeric"
                min={1}
                onChange={(e) => setRow(i, { minutes: Number(e.target.value) })}
                type="number"
                value={row.minutes}
              />
            )}
          </Field>
        </div>
      ))}
      <button
        className="link justify-self-start"
        onClick={() =>
          setRows((all) => [...all, { ar: "", en: "", minutes: 10 }])
        }
        type="button"
      >
        {t("addPart")}
      </button>
      <SaveButton pending={save.isPending} success={save.isSuccess} />
      <ErrorLine error={save.error} />
    </form>
  );
};
