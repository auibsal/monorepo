"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { events, unwrap } from "@/lib/data";
import { DiwanSection } from "../../page";
import { ImageField } from "../image-field";
import {
  AddInPlace,
  BilingualField,
  ErrorLine,
  Field,
  SaveButton,
} from "../kit";

const key = (eventId: string) => ["admin", "event-program", eventId];

const pair = (en: string | null, ar: string | null) => ({
  ar: ar ?? "",
  en: en ?? "",
});

type Item = events.ProgramItem;

const blank = (position: number) => ({
  award: pair(null, null),
  credit: "",
  length: "",
  line: pair(null, null),
  position,
  still: null as string | null,
  title: pair(null, null),
  year: "",
});
type Form = ReturnType<typeof blank>;

const fromItem = (item: Item): Form => ({
  award: pair(item.award_en, item.award_ar),
  credit: item.credit ?? "",
  length: item.length_minutes ? String(item.length_minutes) : "",
  line: pair(item.line_en, item.line_ar),
  position: item.position,
  still: item.still_path,
  title: pair(item.title_en, item.title_ar),
  year: item.year ? String(item.year) : "",
});

const toRow = (f: Form) => ({
  award_ar: f.award.ar || null,
  award_en: f.award.en || null,
  credit: f.credit.trim() || null,
  length_minutes: f.length ? Number(f.length) : null,
  line_ar: f.line.ar || null,
  line_en: f.line.en || null,
  position: f.position,
  still_path: f.still,
  title_ar: f.title.ar,
  title_en: f.title.en,
  year: f.year ? Number(f.year) : null,
});

/** One work's fields: titles, the credit line, year, length, a line, award, still. */
const ItemForm = ({
  initial,
  onSave,
  pending,
  success,
}: {
  readonly initial: Form;
  readonly onSave: (form: Form) => void;
  readonly pending: boolean;
  readonly success: boolean;
}) => {
  const t = useTranslations("diwan.admin.event.program");
  const [form, setForm] = useState(initial);
  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave(form);
  };
  return (
    <form className="grid max-w-3xl gap-4" onSubmit={submit}>
      <BilingualField
        label={t("itemTitle")}
        maxLength={200}
        onChange={(v) => set("title", v)}
        required
        value={form.title}
      />
      <Field hint={t("creditHint")} label={t("credit")}>
        {(id) => (
          <Input
            id={id}
            maxLength={200}
            onChange={(e) => set("credit", e.target.value)}
            value={form.credit}
          />
        )}
      </Field>
      <div className="flex flex-wrap gap-4">
        <Field label={t("year")}>
          {(id) => (
            <Input
              className="max-w-32"
              id={id}
              inputMode="numeric"
              max={2100}
              min={1850}
              onChange={(e) => set("year", e.target.value)}
              type="number"
              value={form.year}
            />
          )}
        </Field>
        <Field label={t("length")}>
          {(id) => (
            <Input
              className="max-w-32"
              id={id}
              inputMode="numeric"
              max={600}
              min={1}
              onChange={(e) => set("length", e.target.value)}
              type="number"
              value={form.length}
            />
          )}
        </Field>
      </div>
      <BilingualField
        label={t("line")}
        maxLength={200}
        onChange={(v) => set("line", v)}
        value={form.line}
      />
      <BilingualField
        label={t("award")}
        maxLength={200}
        onChange={(v) => set("award", v)}
        value={form.award}
      />
      <ImageField
        area="events"
        label={t("still")}
        onChange={(v) => set("still", v)}
        value={form.still}
      />
      <SaveButton pending={pending} success={success} />
    </form>
  );
};

/** One saved work, edited in place, or removed. */
const ItemRow = ({
  eventId,
  item,
}: {
  readonly eventId: string;
  readonly item: Item;
}) => {
  const t = useTranslations("diwan.admin.event.program");
  const { supabase } = useAuth();
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const table = () => supabase.schema("api").from("program_items");
  const save = useMutation({
    mutationFn: async (form: Form) =>
      unwrap(await table().update(toRow(form)).eq("id", item.id)),
    onSuccess: () => client.invalidateQueries({ queryKey: key(eventId) }),
  });
  const remove = useMutation({
    mutationFn: async () => unwrap(await table().delete().eq("id", item.id)),
    onSuccess: () => client.invalidateQueries({ queryKey: key(eventId) }),
  });
  const facts = [
    item.credit,
    item.year,
    item.length_minutes
      ? t("minutes", { n: String(item.length_minutes) })
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="border-line grid gap-2 border-t pt-3">
      <p className="type-body font-medium">{item.title_en || item.title_ar}</p>
      {facts ? <p className="type-caption">{facts}</p> : null}
      <div className="flex flex-wrap gap-4">
        <Button
          className="px-0"
          onClick={() => setEditing((v) => !v)}
          type="button"
          variant="link"
        >
          {editing ? t("done") : t("edit")}
        </Button>
        <Button
          className="px-0"
          disabled={remove.isPending}
          onClick={() => remove.mutate()}
          type="button"
          variant="link"
        >
          {t("remove")}
        </Button>
      </div>
      {editing ? (
        <ItemForm
          initial={fromItem(item)}
          onSave={(f) => save.mutate(f)}
          pending={save.isPending}
          success={save.isSuccess}
        />
      ) : null}
      <ErrorLine error={save.error ?? remove.error} />
    </li>
  );
};

/**
 * The event's Program (decisions.md, Events): the works a screening, a
 * reading or a performance shows, in order, each with its credit line (an
 * outside work's director or author, cited as a bibliography cites a
 * work; anyone from the Society is picked from the site's people
 * elsewhere), year, length, one line in both languages, an award and a
 * still. The event's page lists them and the promo kit draws a card for
 * each. Rows, edited in place.
 */
export const EventProgramAdmin = ({
  eventId,
}: {
  readonly eventId: string;
}) => {
  const t = useTranslations("diwan.admin.event.program");
  const { supabase } = useAuth();
  const client = useQueryClient();
  const items = useQuery({
    queryFn: () => events.programItems(supabase, eventId),
    queryKey: key(eventId),
  });
  const add = useMutation({
    mutationFn: async (form: Form) =>
      unwrap(
        await supabase
          .schema("api")
          .from("program_items")
          .insert({ ...toRow(form), event_id: eventId })
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: key(eventId) }),
  });
  const list = items.data ?? [];
  return (
    <DiwanSection description={t("lede")} id="program" title={t("title")}>
      {list.length > 0 ? (
        <ol className="grid gap-3">
          {list.map((item) => (
            <ItemRow eventId={eventId} item={item} key={item.id} />
          ))}
        </ol>
      ) : (
        <p className="type-body text-text-secondary">{t("empty")}</p>
      )}
      <AddInPlace label={t("add")}>
        {(close) => (
          <ItemForm
            initial={blank(list.length)}
            onSave={(f) => add.mutate(f, { onSuccess: close })}
            pending={add.isPending}
            success={false}
          />
        )}
      </AddInPlace>
      <ErrorLine error={add.error} />
    </DiwanSection>
  );
};
