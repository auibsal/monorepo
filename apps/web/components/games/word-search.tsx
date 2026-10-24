"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import {
  cellsOf,
  type GameLang,
  type WordSearch,
  wordBetween,
} from "@repo/sal-data/games";
import { useTranslations } from "next-intl";
import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { loadProgress, saveProgress } from "./storage";

type Cell = [number, number];

/**
 * A word search: choose a word's first letter, then its last. Arrow keys
 * move between letters; Enter or Space chooses one.
 */
export const WordSearchGame = ({
  lang,
  search,
  storageKey,
}: {
  lang: GameLang;
  search: WordSearch;
  storageKey: string;
}) => {
  const t = useTranslations("web.games.search");
  const rtl = lang === "ar";
  const [found, setFound] = useState<string[]>([]);
  const [start, setStart] = useState<Cell | null>(null);
  const [focus, setFocus] = useState<Cell>([0, 0]);
  const [message, setMessage] = useState("");
  const cells = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    setFound(loadProgress<string[]>(`search-${storageKey}`) ?? []);
  }, [storageKey]);

  const foundCells = useMemo(() => {
    const set = new Set<string>();
    for (const w of search.words) {
      if (found.includes(w.word)) {
        for (const c of cellsOf(w)) {
          set.add(c);
        }
      }
    }
    return set;
  }, [found, search.words]);

  const done = found.length === search.words.length;

  const choose = (cell: Cell) => {
    setMessage("");
    if (!start) {
      setStart(cell);
      return;
    }
    if (start[0] === cell[0] && start[1] === cell[1]) {
      setStart(null);
      return;
    }
    const word = wordBetween(search, start, cell);
    setStart(null);
    if (word && !found.includes(word.word)) {
      const next = [...found, word.word];
      setFound(next);
      saveProgress(`search-${storageKey}`, next);
      setMessage(t("foundWord", { word: word.label }));
    } else if (!word) {
      setMessage(t("notAWord"));
    }
  };

  const move = (event: KeyboardEvent<HTMLButtonElement>, [r, c]: Cell) => {
    const forward = rtl ? -1 : 1;
    const steps: Record<string, Cell> = {
      ArrowDown: [r + 1, c],
      ArrowLeft: [r, c - forward],
      ArrowRight: [r, c + forward],
      ArrowUp: [r - 1, c],
    };
    const next = steps[event.key];
    if (!next) {
      return;
    }
    event.preventDefault();
    const clamp = (n: number) => Math.max(0, Math.min(search.size - 1, n));
    const cell: Cell = [clamp(next[0]), clamp(next[1])];
    setFocus(cell);
    cells.current.get(`${cell[0]},${cell[1]}`)?.focus();
  };

  return (
    <div
      className="grid gap-6 md:grid-cols-[auto_1fr] md:items-start"
      dir={rtl ? "rtl" : "ltr"}
      lang={lang}
    >
      <fieldset
        className="m-0 grid w-full min-w-0 max-w-lg gap-1 border-0 p-0"
        style={{
          gridTemplateColumns: `repeat(${search.size}, minmax(0, 1fr))`,
        }}
      >
        <legend className="sr-only">{t("grid")}</legend>
        {search.grid.map((line, r) =>
          line.map((letter, c) => {
            const k = `${r},${c}`;
            const isStart = start?.[0] === r && start[1] === c;
            const isFound = foundCells.has(k);
            return (
              <button
                aria-label={t("cell", {
                  col: String(c + 1),
                  letter,
                  row: String(r + 1),
                })}
                aria-pressed={isStart}
                className={cn(
                  "aspect-square rounded-sm border font-semibold text-base uppercase sm:text-lg",
                  isFound
                    ? "border-line border-t text-text"
                    : "border-transparent",
                  isStart && "border-text bg-text text-surface"
                )}
                key={k}
                onClick={() => choose([r, c])}
                onFocus={() => setFocus([r, c])}
                onKeyDown={(event) => move(event, [r, c])}
                ref={(el) => {
                  if (el) {
                    cells.current.set(k, el);
                  } else {
                    cells.current.delete(k);
                  }
                }}
                tabIndex={focus[0] === r && focus[1] === c ? 0 : -1}
                type="button"
              >
                {letter}
              </button>
            );
          })
        )}
      </fieldset>

      <div className="grid content-start gap-4">
        <p className="type-caption">{t("howTo")}</p>
        <h2 className="type-heading">{t("words")}</h2>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-1">
          {search.words.map((w) => {
            const isFound = found.includes(w.word);
            return (
              <li
                className={cn(isFound && "text-text-secondary line-through")}
                key={w.word}
              >
                {w.label}
                {isFound ? (
                  <span className="sr-only">{` (${t("found")})`}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p aria-live="polite" className="min-h-6" role="status">
          {done
            ? t("done")
            : message ||
              t("progress", {
                found: String(found.length),
                total: String(search.words.length),
              })}
        </p>
        {found.length > 0 ? (
          <Button
            className="justify-self-start"
            onClick={() => {
              setFound([]);
              saveProgress(`search-${storageKey}`, []);
            }}
            type="button"
            variant="outline"
          >
            {t("reset")}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
