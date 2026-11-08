"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { games, unwrap } from "@/lib/data";
import { ErrorLine } from "../kit";

/** How many days ahead the queue shows. */
const AHEAD = 14;
const DAY_MS = 86_400_000;
const key = ["admin", "journal", "game-checks"];

/** What a day's games ask, in a few words, for the editor to read through. */
const answersOf = (lang: games.GameLang, day: number) => ({
  anagrams: games.dailyAnagrams(lang, day).items.map((i) => i.answer),
  crossword: games
    .dailyCrossword(lang, day)
    .entries.map((e) => `${e.answer} (${e.clue})`),
  search: games.dailySearch(lang, day).words.map((w) => w.label),
  word: games.dailyAnswer(lang, day).join(""),
});

/**
 * The editors' check queue (decisions §5): the next two weeks of the daily
 * games, as every reader will get them, in each language. A Games editor
 * marks each day checked, or flags it with a note for the word lists to be
 * fixed before the day comes.
 */
export const GameChecks = () => {
  const t = useTranslations("diwan.admin.games");
  const locale = useLocale();
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const today = games.gameDay();
  const days = Array.from({ length: AHEAD }, (_, i) => today + i);
  const checks = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("game_checks")
          .select("game_day, lang, flagged, note")
          .gte("game_day", today)
      ) ?? [],
    queryKey: key,
  });
  const record = useMutation({
    mutationFn: async (row: {
      flagged: boolean;
      game_day: number;
      lang: string;
      note: string | null;
    }) =>
      unwrap(
        await supabase
          .schema("journal")
          .from("game_checks")
          .upsert({ ...row, checked_at: new Date().toISOString() })
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const [notes, setNotes] = useState<Record<string, string>>({});

  return (
    <section aria-labelledby="game-checks" className="grid gap-4">
      <h2 className="type-heading" id="game-checks">
        {t("title")}
      </h2>
      <p className="type-caption">{t("hint")}</p>
      <ul className="divide-line grid divide-y">
        {days.flatMap((day) =>
          games.gameLangs.map((lang) => {
            const id = `${day}-${lang}`;
            const check = (checks.data ?? []).find(
              (c) => c.game_day === day && c.lang === lang
            );
            const a = answersOf(lang, day);
            return (
              <li className="grid gap-2 py-3" key={id}>
                <p className="font-medium">
                  {t("day", {
                    date: formatLongDate(new Date(day * DAY_MS), locale),
                    language: t(`languages.${lang}`),
                    number: String(games.gameNumber(day)),
                  })}
                  {check
                    ? ` · ${check.flagged ? t("flagged") : t("checked")}`
                    : ""}
                </p>
                <dl
                  className="grid gap-1 text-sm"
                  dir={lang === "ar" ? "rtl" : "ltr"}
                  lang={lang}
                >
                  <div>
                    <dt className="type-label">{t("word")}</dt>
                    <dd>{a.word}</dd>
                  </div>
                  <div>
                    <dt className="type-label">{t("search")}</dt>
                    <dd>{a.search.join(", ")}</dd>
                  </div>
                  <div>
                    <dt className="type-label">{t("crossword")}</dt>
                    <dd>{a.crossword.join("; ")}</dd>
                  </div>
                  <div>
                    <dt className="type-label">{t("anagrams")}</dt>
                    <dd>{a.anagrams.join(", ")}</dd>
                  </div>
                </dl>
                {check?.note ? (
                  <p className="type-caption">{check.note}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    disabled={record.isPending}
                    onClick={() =>
                      record.mutate({
                        flagged: false,
                        game_day: day,
                        lang,
                        note: null,
                      })
                    }
                    size="sm"
                    variant="outline"
                  >
                    {t("markChecked")}
                  </Button>
                  <Input
                    aria-label={t("note")}
                    className="w-64"
                    onChange={(e) =>
                      setNotes((n) => ({ ...n, [id]: e.target.value }))
                    }
                    placeholder={t("note")}
                    value={notes[id] ?? ""}
                  />
                  <Button
                    disabled={record.isPending || !notes[id]?.trim()}
                    onClick={() =>
                      record.mutate({
                        flagged: true,
                        game_day: day,
                        lang,
                        note: notes[id]?.trim() ?? null,
                      })
                    }
                    size="sm"
                    variant="ghost"
                  >
                    {t("flag")}
                  </Button>
                </div>
              </li>
            );
          })
        )}
      </ul>
      <ErrorLine error={record.error ?? checks.error} />
    </section>
  );
};
