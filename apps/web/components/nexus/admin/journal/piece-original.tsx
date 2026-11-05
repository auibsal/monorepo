"use client";

import { useAuth } from "@repo/auth/provider";
import type { Locale } from "@repo/internationalization";
import { journal, sanitizeRichText, unwrap } from "@repo/sal-data";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { RichTextEditor } from "../../editor/rich-text";
import { ErrorLine, Field, SaveButton, SelectInput } from "../kit";
import type { PieceRecord } from "./workflow";

/**
 * A translation's original, shown beside it on the piece (the design
 * review A24, decision D11). Kept with the text, read under the same rules,
 * and a change to it asks for the approvals again, like the text.
 */
export const PieceOriginal = ({ record }: { record: PieceRecord }) => {
  const t = useTranslations("nexus.admin.waraq.original");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const pieceId = record.piece?.id ?? "";
  const [lang, setLang] = useState<string>(record.body?.original_lang ?? "fr");
  const [html, setHtml] = useState(record.body?.original ?? "");
  const names = new Intl.DisplayNames([locale], { type: "language" });
  const save = useMutation({
    mutationFn: async () => {
      const original = sanitizeRichText(html) || null;
      return unwrap(
        await supabase
          .schema("journal")
          .from("piece_bodies")
          .update({ original, original_lang: original ? lang : null })
          .eq("piece_id", pieceId)
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "journal"] }),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };
  return (
    <section className="grid gap-4">
      <h2 className="type-subheading">{t("title")}</h2>
      <p className="type-body text-text-secondary">{t("lede")}</p>
      <form className="grid gap-4" onSubmit={submit}>
        <Field label={t("language")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) => setLang(e.target.value)}
              value={lang}
            >
              {journal.ORIGINAL_LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {names.of(code) ?? code}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <RichTextEditor
          key={lang}
          label={t("text")}
          lang={lang}
          onChange={setHtml}
          value={html}
        />
        <p className="type-caption">{t("clear")}</p>
        <SaveButton pending={save.isPending} />
        <ErrorLine error={save.error} />
      </form>
    </section>
  );
};
