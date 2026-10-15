"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import {
  type Crossword,
  type CrosswordEntry,
  crosswordCells,
  type GameLang,
  lettersOf,
  normalizeWord,
} from "@repo/sal-data/games";
import { useTranslations } from "next-intl";
import {
  type ChangeEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { loadProgress, saveProgress } from "./storage";

type Filled = Record<string, string>;

const at = (entry: CrosswordEntry, i: number) =>
  entry.across
    ? `${entry.row},${entry.col + i}`
    : `${entry.row + i},${entry.col}`;

/**
 * A crossword: type in the squares, choose a clue or a square twice to
 * change direction. Check marks the wrong squares; nothing is sent anywhere.
 */
export const CrosswordGame = ({
  crossword,
  lang,
  storageKey,
}: {
  crossword: Crossword;
  lang: GameLang;
  storageKey: string;
}) => {
  const t = useTranslations("web.games.crossword");
  const rtl = lang === "ar";
  const grid = useMemo(() => crosswordCells(crossword) ?? [], [crossword]);
  const [filled, setFilled] = useState<Filled>({});
  const [active, setActive] = useState<{ across: boolean; cell: string }>(
    () => {
      const [first] = crossword.entries;
      return {
        across: first?.across ?? true,
        cell: first ? at(first, 0) : "0,0",
      };
    }
  );
  const [checked, setChecked] = useState(false);
  const inputs = useRef(new Map<string, HTMLInputElement>());

  useEffect(() => {
    setFilled(loadProgress<Filled>(`crossword-${storageKey}`) ?? {});
  }, [storageKey]);

  const update = (next: Filled) => {
    setFilled(next);
    setChecked(false);
    saveProgress(`crossword-${storageKey}`, next);
  };

  const entriesAt = (cell: string) =>
    crossword.entries.filter((e) =>
      lettersOf(e.answer).some((_, i) => at(e, i) === cell)
    );

  const activeEntry =
    entriesAt(active.cell).find((e) => e.across === active.across) ??
    entriesAt(active.cell)[0];
  const activeCells = new Set(
    activeEntry
      ? lettersOf(activeEntry.answer).map((_, i) => at(activeEntry, i))
      : []
  );

  const focusCell = (cell: string, across = active.across) => {
    const has = entriesAt(cell);
    const direction = has.some((e) => e.across === across)
      ? across
      : (has[0]?.across ?? across);
    setActive({ across: direction, cell });
    inputs.current.get(cell)?.focus();
  };

  const step = (cell: string, by: number, across = active.across) => {
    const [r = 0, c = 0] = cell.split(",").map(Number);
    const next = across ? `${r},${c + by}` : `${r + by},${c}`;
    const [nr = 0, nc = 0] = next.split(",").map(Number);
    return grid[nr]?.[nc] ? next : null;
  };

  const onInput = (cell: string, event: ChangeEvent<HTMLInputElement>) => {
    const letters = lettersOf(normalizeWord(event.target.value, lang));
    const letter = letters.at(-1);
    if (!letter) {
      return;
    }
    update({ ...filled, [cell]: letter });
    const next = step(cell, 1);
    if (next) {
      focusCell(next);
    }
  };

  const onKey = (cell: string, event: KeyboardEvent<HTMLInputElement>) => {
    const forward = rtl ? -1 : 1;
    const arrows: Record<string, [boolean, number]> = {
      ArrowDown: [false, 1],
      ArrowLeft: [true, -forward],
      ArrowRight: [true, forward],
      ArrowUp: [false, -1],
    };
    const arrow = arrows[event.key];
    if (arrow) {
      event.preventDefault();
      const next = step(cell, arrow[1], arrow[0]);
      if (next) {
        focusCell(next, arrow[0]);
      }
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      if (filled[cell]) {
        const { [cell]: _, ...rest } = filled;
        update(rest);
      } else {
        const back = step(cell, -1);
        if (back) {
          const { [back]: _, ...rest } = filled;
          update(rest);
          focusCell(back);
        }
      }
    }
  };

  const solved = grid.every((line, r) =>
    line.every((sq, c) => !sq || filled[`${r},${c}`] === sq.letter)
  );
  const wrong = (cell: string, letter: string) =>
    checked && Boolean(filled[cell]) && filled[cell] !== letter;

  const reveal = () => {
    const all: Filled = {};
    grid.forEach((line, r) => {
      line.forEach((sq, c) => {
        if (sq) {
          all[`${r},${c}`] = sq.letter;
        }
      });
    });
    update(all);
  };

  const clueList = (across: boolean) =>
    crossword.entries
      .filter((e) => e.across === across)
      .sort((a, b) => a.number - b.number);

  return (
    <div
      className="grid gap-8 lg:grid-cols-[auto_1fr]"
      dir={rtl ? "rtl" : "ltr"}
      lang={lang}
    >
      <div className="grid content-start gap-4">
        <p aria-live="polite" className="type-subheading min-h-8">
          {activeEntry
            ? `${activeEntry.number} ${activeEntry.across ? t("across") : t("down")}: ${activeEntry.clue}`
            : null}
        </p>
        <fieldset
          className="m-0 grid w-full min-w-0 max-w-xl gap-px border border-text bg-text p-0"
          style={{
            gridTemplateColumns: `repeat(${crossword.cols}, minmax(0, 1fr))`,
          }}
        >
          <legend className="sr-only">{t("grid")}</legend>
          {grid.map((line, r) =>
            line.map((sq, c) => {
              const k = `${r},${c}`;
              if (!sq) {
                return (
                  <span aria-hidden className="aspect-square bg-text" key={k} />
                );
              }
              return (
                <span className="relative aspect-square bg-surface" key={k}>
                  {sq.number ? (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute start-0.5 top-0 text-[0.55rem] leading-tight sm:text-xs"
                    >
                      {sq.number}
                    </span>
                  ) : null}
                  <input
                    aria-invalid={wrong(k, sq.letter) || undefined}
                    aria-label={t("cell", {
                      col: String(c + 1),
                      row: String(r + 1),
                    })}
                    autoCapitalize="characters"
                    autoComplete="off"
                    className={cn(
                      "size-full bg-transparent text-center font-semibold text-base uppercase caret-transparent outline-none focus:bg-surface-tint sm:text-xl",
                      activeCells.has(k) && "bg-surface-tint",
                      k === active.cell && "ring-2 ring-accent-line ring-inset",
                      wrong(k, sq.letter) && "text-title line-through"
                    )}
                    maxLength={2}
                    onChange={(event) => onInput(k, event)}
                    onClick={() =>
                      k === active.cell
                        ? focusCell(k, !active.across)
                        : focusCell(k)
                    }
                    onFocus={() =>
                      setActive((a) => (a.cell === k ? a : { ...a, cell: k }))
                    }
                    onKeyDown={(event) => onKey(k, event)}
                    ref={(el) => {
                      if (el) {
                        inputs.current.set(k, el);
                      } else {
                        inputs.current.delete(k);
                      }
                    }}
                    spellCheck={false}
                    value={filled[k] ?? ""}
                  />
                </span>
              );
            })
          )}
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setChecked(true)}
            type="button"
            variant="outline"
          >
            {t("check")}
          </Button>
          <Button onClick={reveal} type="button" variant="outline">
            {t("reveal")}
          </Button>
          <Button onClick={() => update({})} type="button" variant="ghost">
            {t("clear")}
          </Button>
        </div>
        <p aria-live="polite" className="min-h-6" role="status">
          {solved ? t("solved") : null}
          {!solved && checked ? t("checked") : null}
        </p>
        <p className="type-caption">{t("howTo")}</p>
      </div>

      <div className="grid content-start gap-8 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {[true, false].map((across) => (
          <section className="grid content-start gap-2" key={String(across)}>
            <h2 className="type-kicker border-accent-line border-b pb-2">
              {across ? t("across") : t("down")}
            </h2>
            <ol className="grid gap-1">
              {clueList(across).map((e) => (
                <li key={`${e.number}-${across}`}>
                  <button
                    aria-current={activeEntry === e ? "true" : undefined}
                    className="w-full rounded-sm px-2 py-1 text-start hover:bg-surface-tint aria-[current=true]:bg-surface-tint"
                    onClick={() => focusCell(at(e, 0), e.across)}
                    type="button"
                  >
                    <span className="font-semibold">{e.number}</span> {e.clue}
                  </button>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
};
