"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { unwrap } from "@repo/sal-data";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { queryKeys, useMySixWords } from "@/lib/queries";
import { ErrorLine } from "../admin/kit";
import { EmptyLine } from "../states";
import { Section } from "./section";

const ARABIC = /[؀-ۿ]/;
const SPACE = /\s+/;
const words = (text: string) => text.trim().split(SPACE).filter(Boolean);

/**
 * The member's six words for the Book of Members: written and changed
 * here, then approved by a moderator before they appear on the Society
 * page. A change goes back to moderation.
 */
export const SixWords = () => {
  const t = useTranslations("nexus.home.sixWords");
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const entry = useMySixWords();
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const fieldId = useId();

  const save = useMutation({
    mutationFn: async (value: string) => {
      const row = {
        language: ARABIC.test(value) ? "ar" : "en",
        status: "pending",
        text: words(value).join(" "),
        user_id: user?.id ?? "",
      };
      const table = supabase.schema("programmes").from("six_words");
      unwrap(
        entry.data
          ? await table.update(row).eq("id", entry.data.id)
          : await table.insert(row)
      );
    },
    onSuccess: async () => {
      setWriting(false);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.sixWords(user?.id ?? ""),
      });
    },
  });

  const start = () => {
    setText(entry.data?.text ?? "");
    setWriting(true);
  };
  const count = words(text).length;
  const form = (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (count === 6) {
          save.mutate(text);
        }
      }}
    >
      <label className="type-caption" htmlFor={fieldId}>
        {t("hint")}
      </label>
      <Textarea
        dir="auto"
        id={fieldId}
        onChange={(event) => setText(event.target.value)}
        required
        rows={2}
        value={text}
      />
      <p aria-live="polite" className="type-caption">
        {t("count", { count })}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button disabled={count !== 6 || save.isPending} type="submit">
          {t("save")}
        </Button>
        {entry.data ? (
          <Button
            onClick={() => setWriting(false)}
            type="button"
            variant="outline"
          >
            {t("cancel")}
          </Button>
        ) : null}
      </div>
      <ErrorLine error={save.error} />
    </form>
  );

  return (
    <Section
      action={
        entry.data && !writing ? (
          <button
            className="type-label text-xs underline underline-offset-4"
            onClick={start}
            type="button"
          >
            {t("edit")}
          </button>
        ) : undefined
      }
      id="six-words"
      title={t("title")}
    >
      <p className="type-caption">{t("description")}</p>
      {entry.data && !writing ? (
        <blockquote
          className="type-heading"
          dir="auto"
          lang={entry.data.language}
        >
          {entry.data.text}
        </blockquote>
      ) : null}
      {entry.data?.status === "pending" && !writing ? (
        <p className="type-caption">{t("pending")}</p>
      ) : null}
      {entry.isSuccess && !entry.data && !writing ? (
        <>
          <EmptyLine>{t("empty")}</EmptyLine>
          <Button className="justify-self-start" onClick={start} type="button">
            {t("write")}
          </Button>
        </>
      ) : null}
      {writing ? form : null}
    </Section>
  );
};
