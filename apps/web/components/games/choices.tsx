"use client";

import { Button } from "@repo/brand/components/ui/button";
import { cn } from "@repo/brand/lib/utils";
import { type Choices, choicesFor, type GameLang } from "@repo/sal-data/games";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { loadProgress, saveProgress } from "./storage";

/**
 * A quiz, or name the book (the design review A17): each question with its
 * answers in a fixed order; choosing one shows whether it was right and,
 * after, the note (name the book: the author). The answers given stay in
 * this browser only.
 */
export const ChoicesGame = ({
  kind,
  lang,
  quiz,
  storageKey,
}: {
  readonly kind: "quiz" | "name_the_book";
  readonly lang: GameLang;
  readonly quiz: Choices;
  readonly storageKey: string;
}) => {
  const t = useTranslations("web.games.choices");
  const [picked, setPicked] = useState<(string | null)[]>([]);
  const progressKey = `choices-${storageKey}`;

  useEffect(() => {
    setPicked(loadProgress<(string | null)[]>(progressKey) ?? []);
  }, [progressKey]);

  const orders = useMemo(
    () => quiz.items.map((item, i) => choicesFor(item, `${storageKey}-${i}`)),
    [quiz.items, storageKey]
  );
  const answered = quiz.items.filter((_, i) => picked[i]).length;
  const right = quiz.items.filter(
    (item, i) => picked[i] === item.answer
  ).length;
  const done = answered === quiz.items.length;

  const choose = (index: number, answer: string) => {
    const next = quiz.items.map((_, i) =>
      i === index ? answer : (picked[i] ?? null)
    );
    setPicked(next);
    saveProgress(progressKey, next);
  };
  const reset = () => {
    setPicked([]);
    saveProgress(progressKey, []);
  };

  return (
    <div className="grid max-w-3xl gap-8" dir={lang === "ar" ? "rtl" : "ltr"}>
      <ol className="grid gap-8">
        {quiz.items.map((item, i) => {
          const chosen = picked[i] ?? null;
          return (
            <li
              className="grid gap-3 border-line border-t pt-space-4"
              key={item.prompt}
            >
              <p className="type-caption text-text-secondary">
                {t("number", {
                  number: String(i + 1),
                  total: String(quiz.items.length),
                })}
              </p>
              <p
                className={cn(
                  "type-heading",
                  kind === "name_the_book" && "font-read italic"
                )}
              >
                {item.prompt}
              </p>
              <div className="flex flex-wrap gap-2">
                {(orders[i] ?? []).map((option) => {
                  const isRight = option === item.answer;
                  const show = chosen !== null;
                  return (
                    <Button
                      aria-pressed={chosen === option}
                      className={cn(
                        show && isRight && "border-text font-medium",
                        show && !isRight && chosen === option && "line-through"
                      )}
                      disabled={show}
                      key={option}
                      onClick={() => choose(i, option)}
                      type="button"
                      variant="outline"
                    >
                      {option}
                    </Button>
                  );
                })}
              </div>
              {chosen === null ? null : (
                <p aria-live="polite" className="type-body" role="status">
                  {chosen === item.answer
                    ? t("right")
                    : t("wrong", { answer: item.answer })}
                  {item.note ? ` ${item.note}` : ""}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      <p aria-live="polite" className="type-subheading" role="status">
        {done
          ? t("score", {
              right: String(right),
              total: String(quiz.items.length),
            })
          : t("progress", {
              answered: String(answered),
              total: String(quiz.items.length),
            })}
      </p>
      {answered > 0 ? (
        <Button
          className="justify-self-start"
          onClick={reset}
          type="button"
          variant="ghost"
        >
          {t("again")}
        </Button>
      ) : null}
    </div>
  );
};
