"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import {
  currentStreak,
  dailyAnswer,
  type GameLang,
  gameDay,
  keyboardRows,
  MAX_GUESSES,
  type Mark,
  nextStreak,
  normalizeWord,
  type Streak,
  scoreGuess,
  WORD_LENGTH,
} from "@repo/sal-data/games";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { loadProgress, saveProgress } from "./storage";

const tile: Record<Mark | "empty" | "typed", string> = {
  empty: "border-line bg-surface",
  hit: "border-text bg-text text-surface",
  miss: "border-line bg-surface text-text-secondary",
  near: "border-line border-t border-line text-text",
  typed: "border-text bg-surface",
};

const rank: Record<Mark, number> = { hit: 3, miss: 1, near: 2 };

/** Today's five-letter word in six tries; the day is read in the browser. */
export const WordGuess = ({ lang }: { lang: GameLang }) => {
  const t = useTranslations("web.games");
  const [day, setDay] = useState<number | null>(null);
  const [guesses, setGuesses] = useState<string[][]>([]);
  const [current, setCurrent] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  // Days in a row solved, kept in this browser like the guesses.
  const [streak, setStreak] = useState(0);
  const streakKey = `streak-guess-${lang}`;

  useEffect(() => {
    const today = gameDay();
    setDay(today);
    setGuesses(loadProgress<string[][]>(`guess-${lang}-${today}`) ?? []);
    setStreak(currentStreak(loadProgress<Streak>(streakKey), today));
  }, [lang, streakKey]);

  const answer = useMemo(
    () => (day === null ? [] : dailyAnswer(lang, day)),
    [day, lang]
  );
  const marks = useMemo(
    () => guesses.map((g) => scoreGuess(answer, g)),
    [answer, guesses]
  );
  const won = marks.some((m) => m.every((x) => x === "hit"));
  const over = won || guesses.length >= MAX_GUESSES;

  useEffect(() => {
    if (won && day !== null) {
      const next = nextStreak(loadProgress<Streak>(streakKey), day);
      saveProgress(streakKey, next);
      setStreak(next.count);
    }
  }, [day, streakKey, won]);

  const keyMarks = useMemo(() => {
    const best = new Map<string, Mark>();
    guesses.forEach((g, row) => {
      g.forEach((letter, i) => {
        const mark = marks[row]?.[i] ?? "miss";
        const had = best.get(letter);
        if (!had || rank[mark] > rank[had]) {
          best.set(letter, mark);
        }
      });
    });
    return best;
  }, [guesses, marks]);

  const type = useCallback(
    (key: string) => {
      if (over || day === null) {
        return;
      }
      setMessage("");
      if (key === "Enter") {
        if (current.length < WORD_LENGTH) {
          setMessage(t("guess.tooShort"));
          return;
        }
        const next = [...guesses, current];
        setGuesses(next);
        setCurrent([]);
        saveProgress(`guess-${lang}-${day}`, next);
        return;
      }
      if (key === "Backspace") {
        setCurrent((c) => c.slice(0, -1));
        return;
      }
      const letter = normalizeWord(key, lang);
      if (letter.length === 1 && current.length < WORD_LENGTH) {
        setCurrent((c) => [...c, letter]);
      }
    },
    [current, day, guesses, lang, over, t]
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, button")) {
        return;
      }
      if (
        event.key === "Enter" ||
        event.key === "Backspace" ||
        event.key.length === 1
      ) {
        event.preventDefault();
        type(event.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [type]);

  if (day === null) {
    return null;
  }

  const rows = Array.from({ length: MAX_GUESSES }, (_, row) => {
    const letters =
      guesses[row] ?? (row === guesses.length ? current : ([] as string[]));
    return { letters, marks: marks[row], row };
  });

  return (
    <div
      className="grid justify-items-center gap-6"
      dir={lang === "ar" ? "rtl" : "ltr"}
      lang={lang}
    >
      <h2 className="sr-only">{t("guess.board")}</h2>
      <ol className="grid gap-2">
        {rows.map(({ letters, marks: rowMarks, row }) => (
          <li
            aria-label={t("guess.row", { number: String(row + 1) })}
            className="grid grid-cols-5 gap-2"
            key={row}
          >
            {Array.from({ length: WORD_LENGTH }, (_, i) => {
              const letter = letters[i];
              const mark = rowMarks?.[i];
              let label = t("guess.empty");
              if (letter && mark) {
                label = t(`guess.${mark}`, { letter });
              } else if (letter) {
                label = letter;
              }
              return (
                <span
                  aria-label={label}
                  className={cn(
                    "grid size-12 place-items-center rounded-md border-2 font-semibold text-2xl sm:size-14",
                    tile[mark ?? (letter ? "typed" : "empty")]
                  )}
                  // biome-ignore lint/suspicious/noArrayIndexKey: squares are positions
                  key={i}
                  role="img"
                >
                  {letter ?? ""}
                </span>
              );
            })}
          </li>
        ))}
      </ol>

      <p aria-live="polite" className="min-h-6 text-center" role="status">
        {message}
        {won ? t("guess.won", { tries: String(guesses.length) }) : null}
        {over && !won ? t("guess.lost", { word: answer.join("") }) : null}
        {over && streak > 0
          ? ` ${t("guess.streak", { days: String(streak) })}`
          : null}
        {over ? ` ${t("guess.tomorrow")}` : null}
      </p>

      <fieldset className="m-0 grid w-full min-w-0 max-w-xl gap-2 border-0 p-0">
        <legend className="sr-only">{t("guess.keyboard")}</legend>
        {keyboardRows[lang].map((line, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: keyboard rows are fixed
          <div className="flex justify-center gap-1" key={i}>
            {i === keyboardRows[lang].length - 1 ? (
              <Button
                className="h-12 px-2 text-xs"
                disabled={over}
                onClick={() => type("Enter")}
                type="button"
                variant="outline"
              >
                {t("guess.enter")}
              </Button>
            ) : null}
            {line.map((key) => {
              const mark = keyMarks.get(key);
              return (
                <button
                  aria-label={mark ? t(`guess.${mark}`, { letter: key }) : key}
                  className={cn(
                    "h-12 min-w-0 flex-1 rounded-md border font-semibold text-lg disabled:opacity-60",
                    mark ? tile[mark] : "border-line border-t"
                  )}
                  disabled={over}
                  key={key}
                  onClick={() => type(key)}
                  type="button"
                >
                  {key}
                </button>
              );
            })}
            {i === keyboardRows[lang].length - 1 ? (
              <Button
                className="h-12 px-2 text-xs"
                disabled={over}
                onClick={() => type("Backspace")}
                type="button"
                variant="outline"
              >
                {t("guess.delete")}
              </Button>
            ) : null}
          </div>
        ))}
      </fieldset>
      <p className="type-caption max-w-md text-center">{t("guess.howTo")}</p>
    </div>
  );
};
