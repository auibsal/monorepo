"use client";

import { Input } from "@repo/brand/components/ui/input";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { slugFromTitle } from "@/lib/addresses";
import { useAuth } from "@/lib/auth/provider";
import { localized, unwrap } from "@/lib/data";
import { Link } from "@/lib/diwan/navigation";
import { DiwanSection, RowList } from "../page";
import { EmptyLine, SectionSpinner } from "../states";
import {
  AddInPlace,
  AdminHeading,
  BilingualField,
  ErrorLine,
  Field,
  SaveButton,
} from "./kit";

export const PRESET_KINDS = [
  "event",
  "opening",
  "call",
  "announcement",
  "letter",
] as const;
export type PresetKind = (typeof PRESET_KINDS)[number];

/** Where each kind's list is, for the way back. */
const BACK: Record<PresetKind, string> = {
  announcement: "/council/announcements",
  call: "/qirtas/editions",
  event: "/events",
  letter: "/membership/service/letters",
  opening: "/membership/openings",
};

interface Line {
  readonly ar: string;
  readonly en: string;
  readonly minutes?: number;
  readonly phase?: string;
}

interface Preset {
  readonly fields: Record<string, unknown>;
  readonly id: string;
  readonly key: string;
  readonly title_ar: string;
  readonly title_en: string;
}

const linesOf = (value: unknown): Line[] =>
  Array.isArray(value) ? (value as Line[]) : [];

/** A kind's presets, in their order. */
export const usePresets = (kind: PresetKind) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      (unwrap(
        await supabase
          .schema("api")
          .from("presets")
          .select("id, key, title_en, title_ar, fields")
          .eq("kind", kind)
          .order("sort")
      ) ?? []) as Preset[],
    queryKey: ["admin", "presets", kind],
  });
};

/** A list of short lines, each in both languages (and minutes or phase). */
const LinesField = ({
  label,
  onChange,
  value,
  withMinutes = false,
}: {
  readonly label: string;
  readonly onChange: (lines: Line[]) => void;
  readonly value: readonly Line[];
  readonly withMinutes?: boolean;
}) => {
  const t = useTranslations("diwan.admin.presets");
  const set = (i: number, next: Partial<Line>) =>
    onChange(value.map((l, j) => (j === i ? { ...l, ...next } : l)));
  return (
    <fieldset className="grid gap-4">
      <legend className="type-label mb-2">{label}</legend>
      {value.map((line, i) => (
        <div
          className="border-line grid gap-3 border-t pt-3"
          // biome-ignore lint/suspicious/noArrayIndexKey: lines have no ids
          key={i}
        >
          <BilingualField
            label={t("line", { n: formatNumber(i + 1) })}
            maxLength={300}
            onChange={(v) => set(i, v)}
            value={{ ar: line.ar, en: line.en }}
          />
          {withMinutes ? (
            <Field label={t("minutes")}>
              {(id) => (
                <Input
                  className="max-w-32"
                  id={id}
                  min={1}
                  onChange={(e) => set(i, { minutes: Number(e.target.value) })}
                  type="number"
                  value={line.minutes ?? 10}
                />
              )}
            </Field>
          ) : null}
          <button
            className="link text-text-secondary justify-self-start"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            type="button"
          >
            {t("removeLine")}
          </button>
        </div>
      ))}
      <button
        className="link justify-self-start"
        onClick={() =>
          onChange([
            ...value,
            withMinutes ? { ar: "", en: "", minutes: 10 } : { ar: "", en: "" },
          ])
        }
        type="button"
      >
        {t("addLine")}
      </button>
    </fieldset>
  );
};

/** One preset's form: its name, then its kind's fields. */
const PresetForm = ({
  close,
  kind,
  preset,
}: {
  readonly close: () => void;
  readonly kind: PresetKind;
  readonly preset: Preset | null;
}) => {
  const t = useTranslations("diwan.admin.presets");
  const { supabase } = useAuth();
  const client = useQueryClient();
  const fields = preset?.fields ?? {};
  const [title, setTitle] = useState({
    ar: preset?.title_ar ?? "",
    en: preset?.title_en ?? "",
  });
  const [duration, setDuration] = useState(
    String(fields.duration_minutes ?? 90)
  );
  const [run, setRun] = useState(linesOf(fields.run_of_show));
  const [shifts, setShifts] = useState(linesOf(fields.shifts));
  const [checklist, setChecklist] = useState(linesOf(fields.checklist));
  const [body, setBody] = useState({
    ar: String(fields.body_ar ?? ""),
    en: String(fields.body_en ?? ""),
  });
  const plain = (lines: Line[]) =>
    lines
      .filter((l) => l.en.trim() || l.ar.trim())
      .map(({ ar, en, minutes, phase }) => ({
        ar,
        en,
        ...(minutes === undefined ? {} : { minutes }),
        ...(phase === undefined ? {} : { phase }),
      }));
  const save = useMutation({
    mutationFn: async () => {
      const next =
        kind === "event"
          ? {
              ...fields,
              checklist: plain(checklist).map((l) => ({
                ...l,
                phase: l.phase ?? "before",
              })),
              duration_minutes: Number(duration) || 90,
              run_of_show: plain(run),
              shifts: plain(shifts),
            }
          : { ...fields, body_ar: body.ar, body_en: body.en };
      const table = supabase.schema("api").from("presets");
      unwrap(
        preset
          ? await table
              .update({
                fields: next,
                title_ar: title.ar || title.en,
                title_en: title.en,
                updated_at: new Date().toISOString(),
              })
              .eq("id", preset.id)
          : await table.insert({
              fields: next,
              key: slugFromTitle(title.en, title.ar),
              kind,
              sort: 100,
              title_ar: title.ar || title.en,
              title_en: title.en,
            })
      );
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["admin", "presets", kind] });
      close();
    },
  });
  return (
    <form
      className="grid max-w-3xl gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <BilingualField
        label={t("name")}
        maxLength={200}
        onChange={setTitle}
        required
        value={title}
      />
      {kind === "event" ? (
        <>
          <Field label={t("duration")}>
            {(id) => (
              <Input
                className="max-w-32"
                id={id}
                min={15}
                onChange={(e) => setDuration(e.target.value)}
                type="number"
                value={duration}
              />
            )}
          </Field>
          <LinesField
            label={t("runOfShow")}
            onChange={setRun}
            value={run}
            withMinutes
          />
          <LinesField label={t("shifts")} onChange={setShifts} value={shifts} />
          <LinesField
            label={t("checklist")}
            onChange={setChecklist}
            value={checklist}
          />
        </>
      ) : (
        <BilingualField
          label={t("body")}
          maxLength={4000}
          multiline
          onChange={setBody}
          rows={8}
          value={body}
        />
      )}
      <SaveButton pending={save.isPending} success={save.isSuccess} />
      <ErrorLine error={save.error} />
    </form>
  );
};

/**
 * A kind's presets (decisions.md, The site: "Presets"): data, kept by the
 * seat that owns the kind (events: the Director of Events), each edited in
 * place; new records start from one.
 */
export const PresetsAdmin = ({ kind }: { readonly kind: PresetKind }) => {
  const t = useTranslations("diwan.admin.presets");
  const locale = useLocale() as Locale;
  const presets = usePresets(kind);
  return (
    <div className="grid max-w-4xl gap-8">
      <AdminHeading
        actions={
          <Link className="link" href={BACK[kind]}>
            {t("back")}
          </Link>
        }
        title={t(`titles.${kind}`)}
      >
        {t("lede")}
      </AdminHeading>
      {presets.isPending ? <SectionSpinner /> : null}
      <DiwanSection id="presets" title={t("list")}>
        {presets.data?.length === 0 ? (
          <EmptyLine>{t("empty")}</EmptyLine>
        ) : null}
        <RowList>
          {(presets.data ?? []).map((preset) => (
            <li className="grid gap-2" key={preset.id}>
              <span className="type-body font-medium">
                {localized({ ...preset }, "title", locale)}
              </span>
              <AddInPlace label={t("edit")}>
                {(close) => (
                  <PresetForm close={close} kind={kind} preset={preset} />
                )}
              </AddInPlace>
            </li>
          ))}
        </RowList>
        <AddInPlace label={t("add")}>
          {(close) => <PresetForm close={close} kind={kind} preset={null} />}
        </AddInPlace>
      </DiwanSection>
    </div>
  );
};
