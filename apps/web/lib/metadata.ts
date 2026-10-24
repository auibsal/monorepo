import type { Locale } from "@repo/internationalization";
import { locales, localizedPath } from "@repo/internationalization";
import type { Metadata } from "next";
import { createMetadata } from "./create-metadata";

interface PageMetadata {
  description: string;
  /** A share image; otherwise one is drawn from the title (`/[locale]/og`). */
  image?: string;
  title: string;
}

/** The drawn share image for a page (apps/web/app/[locale]/og). */
export const ogImagePath = (
  locale: Locale,
  { title }: Pick<PageMetadata, "title">
) => {
  const query = new URLSearchParams({ title: title.slice(0, 120) });
  return `${localizedPath(locale, "/og")}?${query.toString()}`;
};

/**
 * Page metadata with the canonical URL for this language and hreflang links
 * to the same page in every other language.
 */
export const localizedMetadata = (
  locale: Locale,
  path: string,
  page: PageMetadata
): Metadata =>
  createMetadata({
    ...page,
    alternates: {
      canonical: localizedPath(locale, path),
      languages: Object.fromEntries(
        locales.map((language) => [language, localizedPath(language, path)])
      ),
    },
    image: page.image ?? ogImagePath(locale, { title: page.title }),
    locale,
  });
