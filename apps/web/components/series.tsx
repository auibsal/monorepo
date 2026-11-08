import type { Locale } from "@repo/internationalization";
import { localized, programmes } from "@repo/sal-data";
import type { Metadata } from "next";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/u;

export type Series = NonNullable<
  Awaited<ReturnType<typeof programmes.programmes>>
>[number];

/**
 * The Society's own rows in core.programmes (decisions.md: no event
 * series): the Company's, read for its page at /company. Events belong to
 * none of them.
 */
export const loadProgramme = async (slug: string): Promise<Series | null> => {
  if (!SLUG.test(slug)) {
    return null;
  }
  const all: Awaited<ReturnType<typeof programmes.programmes>> =
    await readPublished(["programmes"], (c) => programmes.programmes(c), []);
  return (all ?? []).find((p) => p.slug === slug && p.is_active) ?? null;
};

export const seriesMetadata = (locale: Locale, series: Series): Metadata =>
  localizedMetadata(locale, series.slug === "company" ? "/company" : "/", {
    description: localized(series, "summary", locale),
    title: localized(series, "name", locale),
  });
