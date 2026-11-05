"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import type { GameLang } from "@repo/sal-data/games";
import { useTranslations } from "next-intl";
import { Field } from "../kit";

/** One anagram as typed: the word and its clue. */
export interface Entry {
  answer: string;
  prompt: string;
}

/** The kinds written as rows (owner, Nov 5, 2026: anagrams only). */
export type EntryKind = "anagram";

export const blankEntry: Entry = { answer: "", prompt: "" };

/** The puzzle's `data` from the rows typed (empty rows are left out). */
export const entriesData = (_kind: EntryKind, entries: readonly Entry[]) => ({
  items: entries
    .filter((e) => e.answer.trim())
    .map((e) => ({
      answer: e.answer.trim(),
      ...(e.prompt.trim() ? { prompt: e.prompt.trim() } : {}),
    })),
});

/** Rows back from a stored puzzle, so a draft reopens as it was typed. */
export const entriesFrom = (data: unknown): Entry[] => {
  const items = (data as { items?: unknown[] } | null)?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return [blankEntry, blankEntry, blankEntry];
  }
  return items.map((raw) => {
    const item = raw as { answer?: string; prompt?: string };
    return { answer: item.answer ?? "", prompt: item.prompt ?? "" };
  });
};

const MAX_ROWS = 20;

/** The words of an anagram set, each with an optional clue. */
export const PuzzleEntries = ({
  entries,
  lang,
  onChange,
}: {
  readonly entries: readonly Entry[];
  readonly lang: GameLang;
  readonly onChange: (entries: Entry[]) => void;
}) => {
  const t = useTranslations("nexus.admin.waraq.games.entries");
  const dir = lang === "ar" ? "rtl" : "ltr";
  const edit = (index: number, patch: Partial<Entry>) =>
    onChange(entries.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  return (
    <fieldset className="grid gap-6">
      <legend className="mb-2 font-medium text-sm">{t("anagram.title")}</legend>
      <p className="type-caption">{t("anagram.hint")}</p>
      {entries.map((entry, i) => (
        <div
          className="grid gap-3 border-line border-t pt-4 sm:grid-cols-2"
          // biome-ignore lint/suspicious/noArrayIndexKey: rows are edited in place
          key={i}
        >
          <Field label={t("anagram.answer")}>
            {(id) => (
              <Input
                dir={dir}
                id={id}
                maxLength={30}
                onChange={(e) => edit(i, { answer: e.target.value })}
                value={entry.answer}
              />
            )}
          </Field>
          <Field label={t("anagram.prompt", { number: String(i + 1) })}>
            {(id) => (
              <Input
                dir={dir}
                id={id}
                maxLength={200}
                onChange={(e) => edit(i, { prompt: e.target.value })}
                value={entry.prompt}
              />
            )}
          </Field>
          <Button
            className="justify-self-start"
            onClick={() => onChange(entries.filter((_, j) => j !== i))}
            size="sm"
            type="button"
            variant="ghost"
          >
            {t("remove", { number: String(i + 1) })}
          </Button>
        </div>
      ))}
      <Button
        className="justify-self-start"
        disabled={entries.length >= MAX_ROWS}
        onClick={() => onChange([...entries, blankEntry])}
        size="sm"
        type="button"
        variant="outline"
      >
        {t("anagram.add")}
      </Button>
    </fieldset>
  );
};
