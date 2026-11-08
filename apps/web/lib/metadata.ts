import type { Locale } from "@repo/internationalization";
import { locales, localizedPath } from "@repo/internationalization";
import type { Metadata } from "next";
import { createMetadata } from "./create-metadata";
import { signOgTitle } from "./og-signature";

interface PageMetadata {
  description: string;
  /** An RSS feed for this page, a site path (design review A6). */
  feed?: string;
  /** A share image; otherwise one is drawn from the title (`/[locale]/og`). */
  image?: string;
  /** The languages the page exists in, when not every one (a piece). */
  languages?: readonly Locale[];
  title: string;
}

/** The drawn share image for a page (apps/web/app/[locale]/og). */
const ogImagePath = (
  locale: Locale,
  { title }: Pick<PageMetadata, "title">
) => {
  const text = title.slice(0, 120);
  const signature = signOgTitle(locale, text);
  const query = new URLSearchParams(
    signature ? { sig: signature, title: text } : {}
  );
  const search = query.toString();
  return `${localizedPath(locale, "/og")}${search ? `?${search}` : ""}`;
};

/**
 * Page metadata with the canonical URL for this language and hreflang links
 * to the same page in every other language.
 */
export const localizedMetadata = (
  locale: Locale,
  path: string,
  page: PageMetadata
): Metadata => {
  const { feed, languages = locales, ...rest } = page;
  return createMetadata({
    ...rest,
    alternates: {
      canonical: localizedPath(locale, path),
      languages: Object.fromEntries(
        languages.map((language) => [language, localizedPath(language, path)])
      ),
      ...(feed
        ? {
            types: {
              "application/rss+xml": localizedPath(locale, feed),
            },
          }
        : {}),
    },
    image: page.image ?? ogImagePath(locale, { title: page.title }),
    locale,
  });
};
