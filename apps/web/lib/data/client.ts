import type { Database } from "@repo/database";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Any Supabase client typed for the SAL schemas (browser, server or admin). */
export type Client = SupabaseClient<Database>;

export class DataError extends Error {
  readonly code: string;

  constructor(error: { code?: string; message: string }) {
    super(error.message);
    this.name = "DataError";
    this.code = error.code ?? "unknown";
  }
}

/** Throws on a Supabase error; returns the data otherwise. */
export const unwrap = <T>(result: {
  data: T;
  error: { code?: string; message: string } | null;
}): T => {
  if (result.error) {
    throw new DataError(result.error);
  }
  return result.data;
};

/** Picks the `_en` or `_ar` field, falling back to the other language. */
export const localized = <T extends Record<string, unknown>>(
  row: T,
  field: string,
  locale: string
): string => {
  const primary = row[`${field}_${locale === "ar" ? "ar" : "en"}`];
  const fallback = row[`${field}_${locale === "ar" ? "en" : "ar"}`];
  return (
    (typeof primary === "string" && primary) ||
    (typeof fallback === "string" && fallback) ||
    ""
  );
};

let clockSource: () => number = () => Date.now();

/**
 * The time the shared reads compare against (published, still open,
 * coming). The real time by default; the site's published reads set it to
 * a moment kept a few minutes, so their pages can be prerendered (Cache
 * Components). Only the site's server sets it, through `setClock`.
 */
export const currentDate = () => new Date(clockSource());

/** Where `currentDate` reads the time from (the site's server only). */
export const setClock = (source: () => number) => {
  clockSource = source;
};
