"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const SIZES = ["small", "medium", "large"] as const;
type Size = (typeof SIZES)[number];
const KEY = "sal_reading_size";

const stored = (): Size => {
  try {
    const value = window.localStorage.getItem(KEY);
    return SIZES.includes(value as Size) ? (value as Size) : "medium";
  } catch {
    return "medium";
  }
};

const apply = (size: Size) => {
  if (size === "medium") {
    delete document.documentElement.dataset.readingSize;
  } else {
    document.documentElement.dataset.readingSize = size;
  }
};

/**
 * The article's text size (design review C15): three sizes as a row of
 * words, the chosen one marked, remembered in this browser only. It scales
 * the reading column (`reading`), never the page around it.
 */
export const TextSize = () => {
  const t = useTranslations("web.journal.reading");
  const [size, setSize] = useState<Size>("medium");

  useEffect(() => {
    const first = stored();
    setSize(first);
    apply(first);
    return () => apply("medium");
  }, []);

  const choose = (next: Size) => {
    setSize(next);
    apply(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // Private windows may refuse storage; the size still applies here.
    }
  };

  return (
    <fieldset className="type-caption flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <legend className="float-start me-4">{t("textSize")}</legend>
      {SIZES.map((s) => (
        <button
          aria-pressed={size === s}
          className={
            size === s
              ? "font-medium text-text underline decoration-1 underline-offset-4"
              : "text-text-secondary hover:text-text"
          }
          key={s}
          onClick={() => choose(s)}
          type="button"
        >
          {t(`sizes.${s}`)}
        </button>
      ))}
    </fieldset>
  );
};

/**
 * A hairline across the top that fills as the article is read (design
 * review C15). Pure CSS on the scroll timeline (`reading-progress` in the
 * design system); browsers without it, and reduced motion, show nothing.
 */
export const ReadingProgress = () => (
  <div aria-hidden className="reading-progress" />
);
