"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import {
  type Anagrams,
  type GameLang,
  sameAnswer,
  scramble,
} from "@repo/sal-data/games";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useId, useState } from "react";
import { loadProgress, saveProgress } from "./storage";

type State = "open" | "solved" | "shown";

/** One anagram: type the word, check it, or see it. */
const Answer = ({
  answer,
  clue,
  index,
  lang,
  letters,
  onChange,
  state,
}: {
  readonly answer: string;
  readonly clue?: string;
  readonly index: number;
  readonly lang: GameLang;
  readonly letters?: string[];
  readonly onChange: (state: State) => void;
  readonly state: State;
}) => {
  const t = useTranslations("web.games.answers");
  const id = useId();
  const [typed, setTyped] = useState("");
  const [missed, setMissed] = useState(false);
  const check = (event: FormEvent) => {
    event.preventDefault();
    if (sameAnswer(typed, answer, lang)) {
      setMissed(false);
      onChange("solved");
    } else {
      setMissed(true);
    }
  };
  return (
    <li className="border-line pt-space-4 grid gap-3 border-t">
      {letters ? (
        <>
          <p className="sr-only">
            {t("letters", { letters: letters.join(" ") })}
          </p>
          <p aria-hidden className="flex flex-wrap gap-2 font-mono text-2xl">
            {letters.map((letter, i) => (
              <span
                className="border-line grid size-10 place-items-center border-b"
                // biome-ignore lint/suspicious/noArrayIndexKey: letters repeat; positions don't
                key={i}
              >
                {letter}
              </span>
            ))}
          </p>
        </>
      ) : null}
      {clue ? <p className="type-body text-text-secondary">{clue}</p> : null}
      {state === "open" ? (
        <form className="flex flex-wrap items-end gap-2" onSubmit={check}>
          <label className="sr-only" htmlFor={id}>
            {t("answerN", { number: String(index + 1) })}
          </label>
          <Input
            autoComplete="off"
            className="max-w-xs"
            dir="auto"
            id={id}
            onChange={(e) => {
              setTyped(e.target.value);
              setMissed(false);
            }}
            value={typed}
          />
          <Button disabled={!typed.trim()} type="submit" variant="outline">
            {t("check")}
          </Button>
          <Button
            onClick={() => onChange("shown")}
            type="button"
            variant="ghost"
          >
            {t("show")}
          </Button>
        </form>
      ) : (
        <p className="type-body" role="status">
          {state === "solved"
            ? t("solved", { answer })
            : t("shown", { answer })}
        </p>
      )}
      {missed ? (
        <p aria-live="polite" className="type-caption" role="status">
          {t("notYet")}
        </p>
      ) : null}
    </li>
  );
};

/**
 * Anagrams (decisions.md: the daily five, or an editor's set): type
 * each word; only the letters are compared, so spacing and hamzas don't
 * matter. The letters are scrambled the same way for every reader.
 * Progress stays in this browser only.
 */
export const AnswersGame = ({
  lang,
  puzzle,
  storageKey,
}: {
  readonly lang: GameLang;
  readonly puzzle: Anagrams;
  readonly storageKey: string;
}) => {
  const t = useTranslations("web.games.answers");
  const progressKey = `answers-${storageKey}`;
  const [states, setStates] = useState<State[]>([]);
  useEffect(() => {
    setStates(loadProgress<State[]>(progressKey) ?? []);
  }, [progressKey]);
  const { items } = puzzle;
  const update = (index: number, state: State) => {
    const next = items.map((_, i) =>
      i === index ? state : (states[i] ?? "open")
    );
    setStates(next);
    saveProgress(progressKey, next);
  };
  const solved = states.filter((s) => s === "solved").length;
  const closed = states.filter((s) => s !== "open").length;
  return (
    <div className="grid max-w-3xl gap-8" dir={lang === "ar" ? "rtl" : "ltr"}>
      <ol className="grid gap-8">
        {items.map((item, i) => (
          <Answer
            answer={item.answer}
            clue={item.prompt}
            index={i}
            key={item.answer}
            lang={lang}
            letters={scramble(item.answer, lang, `${storageKey}-${i}`)}
            onChange={(state) => update(i, state)}
            state={states[i] ?? "open"}
          />
        ))}
      </ol>
      <p aria-live="polite" className="type-subheading" role="status">
        {closed === items.length
          ? t("score", { solved: String(solved), total: String(items.length) })
          : t("progress", {
              solved: String(solved),
              total: String(items.length),
            })}
      </p>
      {closed > 0 ? (
        <Button
          className="justify-self-start"
          onClick={() => {
            setStates([]);
            saveProgress(progressKey, []);
          }}
          type="button"
          variant="ghost"
        >
          {t("again")}
        </Button>
      ) : null}
    </div>
  );
};
