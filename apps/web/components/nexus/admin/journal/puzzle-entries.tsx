"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { Textarea } from "@repo/brand/components/ui/textarea";
import type { GameLang } from "@repo/sal-data/games";
import { useTranslations } from "next-intl";
import { Field } from "../kit";

/** One row of a quiz, name the book, riddles or anagrams, as typed. */
export interface Entry {
  answer: string;
  note: string;
  prompt: string;
  /** Wrong answers, one per line (quiz, name the book). */
  wrong: string;
}

export type EntryKind = "quiz" | "name_the_book" | "riddle" | "anagram";

export const blankEntry: Entry = {
  answer: "",
  note: "",
  prompt: "",
  wrong: "",
};

const lines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** The puzzle's `data` from the rows typed (empty rows are left out). */
export const entriesData = (kind: EntryKind, entries: readonly Entry[]) => {
  const rows = entries.filter(
    (e) => e.answer.trim() && (kind === "anagram" || e.prompt.trim())
  );
  switch (kind) {
    case "quiz":
    case "name_the_book":
      return {
        items: rows.map((e) => ({
          answer: e.answer.trim(),
          ...(e.note.trim() ? { note: e.note.trim() } : {}),
          prompt: e.prompt.trim(),
          wrong: lines(e.wrong),
        })),
      };
    case "riddle":
      return {
        items: rows.map((e) => ({
          answer: e.answer.trim(),
          prompt: e.prompt.trim(),
        })),
      };
    default:
      return {
        items: rows.map((e) => ({
          answer: e.answer.trim(),
          ...(e.prompt.trim() ? { prompt: e.prompt.trim() } : {}),
        })),
      };
  }
};

/** Rows back from a stored puzzle, so a draft reopens as it was typed. */
export const entriesFrom = (data: unknown): Entry[] => {
  const items = (data as { items?: unknown[] } | null)?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return [blankEntry, blankEntry, blankEntry];
  }
  return items.map((raw) => {
    const item = raw as {
      answer?: string;
      note?: string;
      prompt?: string;
      wrong?: string[];
    };
    return {
      answer: item.answer ?? "",
      note: item.note ?? "",
      prompt: item.prompt ?? "",
      wrong: (item.wrong ?? []).join("\n"),
    };
  });
};

const MAX_ROWS = 20;

/**
 * The rows of a quiz, name the book, riddles or anagrams (the design
 * review A17): each kind asks for what its player needs.
 */
export const PuzzleEntries = ({
  entries,
  kind,
  lang,
  onChange,
}: {
  readonly entries: readonly Entry[];
  readonly kind: EntryKind;
  readonly lang: GameLang;
  readonly onChange: (entries: Entry[]) => void;
}) => {
  const t = useTranslations("nexus.admin.waraq.games.entries");
  const dir = lang === "ar" ? "rtl" : "ltr";
  const choices = kind === "quiz" || kind === "name_the_book";
  const edit = (index: number, patch: Partial<Entry>) =>
    onChange(entries.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  return (
    <fieldset className="grid gap-6">
      <legend className="mb-2 font-medium text-sm">{t(`${kind}.title`)}</legend>
      <p className="type-caption">{t(`${kind}.hint`)}</p>
      {entries.map((entry, i) => (
        <div
          className="grid gap-3 border-line border-t pt-4"
          // biome-ignore lint/suspicious/noArrayIndexKey: rows are edited in place
          key={i}
        >
          <Field label={t(`${kind}.prompt`, { number: String(i + 1) })}>
            {(id) =>
              kind === "anagram" ? (
                <Input
                  dir={dir}
                  id={id}
                  maxLength={200}
                  onChange={(e) => edit(i, { prompt: e.target.value })}
                  value={entry.prompt}
                />
              ) : (
                <Textarea
                  dir={dir}
                  id={id}
                  maxLength={400}
                  onChange={(e) => edit(i, { prompt: e.target.value })}
                  rows={2}
                  value={entry.prompt}
                />
              )
            }
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t(`${kind}.answer`)}>
              {(id) => (
                <Input
                  dir={dir}
                  id={id}
                  maxLength={kind === "anagram" ? 30 : 120}
                  onChange={(e) => edit(i, { answer: e.target.value })}
                  value={entry.answer}
                />
              )}
            </Field>
            {choices ? (
              <Field label={t(`${kind}.note`)}>
                {(id) => (
                  <Input
                    dir={dir}
                    id={id}
                    maxLength={200}
                    onChange={(e) => edit(i, { note: e.target.value })}
                    value={entry.note}
                  />
                )}
              </Field>
            ) : null}
          </div>
          {choices ? (
            <Field hint={t("wrongHint")} label={t("wrong")}>
              {(id) => (
                <Textarea
                  dir={dir}
                  id={id}
                  onChange={(e) => edit(i, { wrong: e.target.value })}
                  rows={3}
                  value={entry.wrong}
                />
              )}
            </Field>
          ) : null}
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
        {t(`${kind}.add`)}
      </Button>
    </fieldset>
  );
};
