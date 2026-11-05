"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { Textarea } from "@repo/brand/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import { journal, localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import {
  AddInPlace,
  BilingualField,
  ConfirmAction,
  ErrorLine,
  Field,
  SaveButton,
} from "../kit";

const key = (pieceId: string) => ["admin", "journal", "figures", pieceId];

const rowsText = (rows: readonly journal.FigureRow[]) =>
  rows
    .map((r) => `${r.label_en ?? ""} | ${r.label_ar ?? ""} | ${r.value}`)
    .join("\n");

interface FigureRecord {
  id: string;
  rows: unknown;
  sort: number;
  source_ar: string | null;
  source_en: string | null;
  title_ar: string | null;
  title_en: string | null;
  unit_ar: string | null;
  unit_en: string | null;
}

const FigureForm = ({
  existing,
  onDone,
  pieceId,
  sort,
}: {
  readonly existing?: FigureRecord;
  readonly onDone: () => void;
  readonly pieceId: string;
  readonly sort: number;
}) => {
  const t = useTranslations("nexus.admin.waraq.figures");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState({
    ar: existing?.title_ar ?? "",
    en: existing?.title_en ?? "",
  });
  const [unit, setUnit] = useState({
    ar: existing?.unit_ar ?? "",
    en: existing?.unit_en ?? "",
  });
  const [source, setSource] = useState({
    ar: existing?.source_ar ?? "",
    en: existing?.source_en ?? "",
  });
  const [text, setText] = useState(
    existing ? rowsText(journal.figureRows(existing.rows)) : ""
  );
  const rows = journal.parseFigureRows(text);
  const save = useMutation({
    mutationFn: async () => {
      const row = {
        rows: rows ?? [],
        source_ar: source.ar.trim() || null,
        source_en: source.en.trim() || null,
        title_ar: title.ar.trim() || null,
        title_en: title.en.trim() || null,
        unit_ar: unit.ar.trim() || null,
        unit_en: unit.en.trim() || null,
      };
      const table = supabase.schema("journal").from("piece_figures");
      return unwrap(
        existing
          ? await table.update(row).eq("id", existing.id)
          : await table.insert({ ...row, piece_id: pieceId, sort })
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "journal"] });
      onDone();
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };
  return (
    <form className="grid gap-4" onSubmit={submit}>
      <BilingualField
        label={t("titleField")}
        maxLength={200}
        onChange={setTitle}
        value={title}
      />
      <Field hint={t("rowsHint")} label={t("rows")}>
        {(id) => (
          <Textarea
            dir="auto"
            id={id}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            value={text}
          />
        )}
      </Field>
      <BilingualField
        label={t("unit")}
        maxLength={40}
        onChange={setUnit}
        value={unit}
      />
      <BilingualField
        label={t("source")}
        maxLength={300}
        onChange={setSource}
        value={source}
      />
      <SaveButton
        disabled={!(rows && (title.en.trim() || title.ar.trim()))}
        pending={save.isPending}
      />
      <ErrorLine error={save.error} />
    </form>
  );
};

/**
 * An explainer's figures (the design review A16): labeled values the
 * reader sees as bars or a table. Each is placed in the text with a
 * paragraph of its own, "[figure 1]"; one not placed shows after the text.
 */
export const PieceFigures = ({ pieceId }: { readonly pieceId: string }) => {
  const t = useTranslations("nexus.admin.waraq.figures");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const figures = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("piece_figures")
          .select(
            "id, sort, title_en, title_ar, unit_en, unit_ar, source_en, source_ar, rows"
          )
          .eq("piece_id", pieceId)
          .order("sort")
      ) ?? [],
    queryKey: key(pieceId),
  });
  const remove = useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await supabase
          .schema("journal")
          .from("piece_figures")
          .delete()
          .eq("id", id)
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "journal"] }),
  });
  const list = figures.data ?? [];
  const next = Math.max(0, ...list.map((f) => f.sort)) + 1;
  return (
    <section className="grid gap-4">
      <h2 className="type-subheading">{t("title")}</h2>
      <p className="type-body text-text-secondary">{t("lede")}</p>
      {list.length > 0 ? (
        <ul className="grid gap-4">
          {list.map((figure) => (
            <li
              className="grid gap-2 border-line border-t pt-3"
              key={figure.id}
            >
              <p className="type-body">
                {t("marker", { n: String(figure.sort) })}{" "}
                {localized(figure, "title", locale) || figure.title_en}
              </p>
              {editing === figure.id ? (
                <FigureForm
                  existing={figure}
                  onDone={() => setEditing(null)}
                  pieceId={pieceId}
                  sort={figure.sort}
                />
              ) : (
                <span className="flex gap-2">
                  <Button
                    onClick={() => setEditing(figure.id)}
                    size="sm"
                    variant="ghost"
                  >
                    {t("edit")}
                  </Button>
                  <ConfirmAction
                    confirmLabel={t("remove")}
                    description={t("removeConfirm")}
                    disabled={remove.isPending}
                    onConfirm={() => remove.mutate(figure.id)}
                    variant="ghost"
                  >
                    {t("remove")}
                  </ConfirmAction>
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {next <= 20 ? (
        <AddInPlace label={t("new")}>
          {(close) => (
            <FigureForm onDone={close} pieceId={pieceId} sort={next} />
          )}
        </AddInPlace>
      ) : null}
      <ErrorLine error={remove.error} />
    </section>
  );
};
