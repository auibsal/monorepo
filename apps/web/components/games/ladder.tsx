"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import {
  type GameLang,
  type Ladder,
  lettersOf,
  normalizeWord,
  sameAnswer,
} from "@repo/sal-data/games";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";
import { loadProgress, saveProgress } from "./storage";

/**
 * A word ladder (the design review A17): from the first word to the last,
 * changing one letter at each step. The reader fills the steps between;
 * each is checked against the editor's ladder. Progress stays in this
 * browser only.
 */
export const LadderGame = ({
  ladder,
  lang,
  storageKey,
}: {
  readonly ladder: Ladder;
  readonly lang: GameLang;
  readonly storageKey: string;
}) => {
  const t = useTranslations("web.games.ladder");
  const progressKey = `ladder-${storageKey}`;
  const { words } = ladder;
  const middle = words.slice(1, -1);
  const size = lettersOf(normalizeWord(words[0] ?? "", lang)).length;
  const [typed, setTyped] = useState<string[]>(() => middle.map(() => ""));
  const [checked, setChecked] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const saved = loadProgress<{ shown: boolean; typed: string[] }>(
      progressKey
    );
    if (saved) {
      setTyped(saved.typed);
      setShown(saved.shown);
    }
  }, [progressKey]);

  const save = (next: string[], reveal = shown) => {
    setTyped(next);
    saveProgress(progressKey, { shown: reveal, typed: next });
  };
  const right = middle.map((word, i) => sameAnswer(typed[i] ?? "", word, lang));
  // Solved once checked: the ladder never tells while the reader types.
  const solved = checked && right.every(Boolean);
  const check = (event: FormEvent) => {
    event.preventDefault();
    setChecked(true);
  };

  return (
    <form
      className="grid max-w-md gap-4"
      dir={lang === "ar" ? "rtl" : "ltr"}
      onSubmit={check}
    >
      <p className="type-body">
        {t("howTo", { letters: String(size), steps: String(middle.length) })}
      </p>
      <ol className="grid gap-2 font-mono text-xl">
        <li className="border-line border-b py-2">{words[0]}</li>
        {middle.map((word, i) => (
          <li className="grid gap-1" key={word}>
            {shown ? (
              <span className="border-line border-b py-2">{word}</span>
            ) : (
              <Input
                aria-invalid={checked && !right[i] ? true : undefined}
                aria-label={t("stepN", { number: String(i + 1) })}
                autoComplete="off"
                className="font-mono text-xl"
                dir="auto"
                onChange={(e) => {
                  setChecked(false);
                  save(typed.map((w, j) => (j === i ? e.target.value : w)));
                }}
                value={typed[i] ?? ""}
              />
            )}
            {checked && !shown && !right[i] ? (
              <span className="type-caption">{t("notThis")}</span>
            ) : null}
          </li>
        ))}
        <li className="border-line border-b py-2">{words.at(-1)}</li>
      </ol>
      <p aria-live="polite" className="type-subheading min-h-8" role="status">
        {solved && !shown ? t("solved") : null}
        {shown ? t("shown") : null}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={shown || solved} type="submit" variant="outline">
          {t("check")}
        </Button>
        <Button
          disabled={shown}
          onClick={() => {
            setShown(true);
            save(typed, true);
          }}
          type="button"
          variant="outline"
        >
          {t("show")}
        </Button>
        <Button
          onClick={() => {
            setChecked(false);
            setShown(false);
            save(
              middle.map(() => ""),
              false
            );
          }}
          type="button"
          variant="ghost"
        >
          {t("again")}
        </Button>
      </div>
    </form>
  );
};
