"use client";

import {
  dailySearch,
  type GameLang,
  gameDay,
  gameNumber,
} from "@repo/sal-data/games";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
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
