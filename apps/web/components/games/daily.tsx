"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  dailyAnagrams,
  dailyCrossword,
  dailySearch,
  type GameLang,
  gameDay,
  gameNumber,
} from "@/lib/data/games";
import { AnswersGame } from "./answers";
import { CrosswordGame } from "./crossword";
import { WordSearchGame } from "./word-search";

// The daily games are worked out in the reader's browser from the Baghdad
// date, so a cached page never shows yesterday's game.
const useGameDay = () => {
  const [day, setDay] = useState<number | null>(null);
  useEffect(() => setDay(gameDay()), []);
  return day;
};

/** "No. 12": today's daily game number. */
export const GameNumber = () => {
  const t = useTranslations("web.games");
  const day = useGameDay();
  return day === null ? null : (
    <span>{t("number", { number: String(gameNumber(day)) })}</span>
  );
};

/** Today's word search: eight words from the list. */
export const DailySearch = ({ lang }: { lang: GameLang }) => {
  const day = useGameDay();
  const search = useMemo(
    () => (day === null ? null : dailySearch(lang, day)),
    [day, lang]
  );
  return search ? (
    <WordSearchGame
      lang={lang}
      search={search}
      storageKey={`daily-${lang}-${day}`}
    />
  ) : null;
};

/** Today's crossword: clued words laid out in a small grid. */
export const DailyCrossword = ({ lang }: { lang: GameLang }) => {
  const day = useGameDay();
  const crossword = useMemo(
    () => (day === null ? null : dailyCrossword(lang, day)),
    [day, lang]
  );
  return crossword && crossword.entries.length > 0 ? (
    <CrosswordGame
      crossword={crossword}
      key={day}
      lang={lang}
      storageKey={`daily-crossword-${lang}-${day}`}
    />
  ) : null;
};

/** Today's five anagrams, each with its clue. */
export const DailyAnagrams = ({ lang }: { lang: GameLang }) => {
  const day = useGameDay();
  const puzzle = useMemo(
    () => (day === null ? null : dailyAnagrams(lang, day)),
    [day, lang]
  );
  return puzzle ? (
    <AnswersGame
      lang={lang}
      puzzle={puzzle}
      storageKey={`daily-anagram-${lang}-${day}`}
    />
  ) : null;
};
