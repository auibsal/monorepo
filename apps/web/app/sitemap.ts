import { project } from "@repo/config";
import {
  type Locale,
  locales,
  localizedPath,
} from "@repo/internationalization";
import { documents, journal } from "@repo/sal-data";
import type { MetadataRoute } from "next";
import { pieceHref } from "@/components/qirtas/cards";
import { readPublished } from "@/lib/supabase";

/**
 * Only pages that exist, each with its Arabic/English alternates. Pages are
 * added here as they are built; members-only content never appears.
 */
const staticPaths = [
  "",
  "/about",
  "/qirtas",
  "/qirtas/news",
  "/qirtas/voices",
  "/qirtas/letters",
  "/qirtas/gallery",
  "/qirtas/video",
  "/next-stop",
  "/qirtas/editions",
  "/qirtas/prize",
  "/qirtas/games",
  "/qirtas/games/word",
  "/qirtas/games/search",
  "/qirtas/games/crossword",
  "/qirtas/games/anagram",
  "/qirtas/masthead",
  "/qirtas/topics",
  "/qirtas/archive",
  "/qirtas/editions/list",
  "/qirtas/write",
  "/next-stop/episodes",
  "/company",
  "/get-involved",
  "/sunday-paper",
  "/join",
  "/join/typewriter-tour",
  "/about/contact",
  "/about/press",
  "/next-stop/care",
  "/events",
  "/library",
  "/about/council",
  "/partners",
];

// Rebuilt hourly, so a renamed program or a new piece appears without a
// deploy.
export const revalidate = 3600;

const localized = (
  path: string,
  lastModified = new Date(),
  only: readonly Locale[] = locales
): MetadataRoute.Sitemap => {
  const languages = Object.fromEntries(
    only.map((locale) => [
      locale,
      new URL(localizedPath(locale, path), project.url).href,
    ])
  );

  return only.map((locale) => ({
    alternates: { languages },
    lastModified,
    url: languages[locale] ?? project.url,
  }));
};

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const [docs, pieces] = await Promise.all([
    readPublished(["documents"], (c) => documents.publicDocuments(c), []),
    readPublished(["journal"], (c) => journal.publishedPieceSlugs(c), []),
  ]);
  return [...staticPaths, ...docs.map((doc) => `/library/${doc.slug}`)]
    .flatMap((path) => localized(path))
    .concat(
      // Qirtas: every published piece, dated when it came out, in the
      // language it was written in (one language per page; bilingual
      // pieces in both).
      pieces.flatMap((piece) =>
        localized(
          pieceHref(piece),
          piece.published_at ? new Date(piece.published_at) : undefined,
          locales.filter(
            (locale) => journal.inLanguage([piece], locale).length > 0
          )
        )
      )
    );
};

export default sitemap;
