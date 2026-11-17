import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));

/**
 * The direction for a block in a given language, or none when it isn't
 * known (decisions.md, Standards: "Mixed scripts on screen").
 */
export const dirOf = (lang: string | null | undefined) => {
  if (!lang) {
    return undefined;
  }
  return lang === "ar" ? ("rtl" as const) : ("ltr" as const);
};
