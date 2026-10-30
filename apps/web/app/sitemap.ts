import { project } from "@repo/config";
import { locales, localizedPath } from "@repo/internationalization";
import { documents, journal, programmes } from "@repo/sal-data";
import type { MetadataRoute } from "next";
import { seriesPath } from "@/components/series";
import { pieceHref } from "@/components/waraq/cards";
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
  "/qirtas/next-stop",
  "/qirtas/editions",
  "/qirtas/prizes",
  "/qirtas/games",
  "/qirtas/games/word",
  "/qirtas/games/search",
  "/sunday-paper",
  "/join",
  "/about/contact",
  "/about/press",
  "/library/privacy",
  "/qirtas/next-stop/care",
  "/events",
  "/library",
  "/about/council",
  "/about/partners",
];

// Rebuilt hourly, so a renamed program or a new piece appears without a
// deploy.
export const revalidate = 3600;

const localized = (
  path: string,
  lastModified = new Date()
): MetadataRoute.Sitemap => {
  const languages = Object.fromEntries(
    locales.map((locale) => [
      locale,
      new URL(localizedPath(locale, path), project.url).href,
    ])
  );

  return locales.map((locale) => ({
    alternates: { languages },
    lastModified,
    url: languages[locale] ?? project.url,
  }));
};

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const [docs, series, pieces] = await Promise.all([
    readPublished(["documents"], (c) => documents.publicDocuments(c), []),
    readPublished(["programmes"], (c) => programmes.programmes(c), []),
    readPublished(["journal"], (c) => journal.publishedPieceSlugs(c), []),
  ]);
  return [
    ...staticPaths,
    ...docs.map((doc) => `/library/${doc.slug}`),
    // Each program's own calendar (Qirtas, the paper, has its own pages).
    ...(series ?? [])
      .filter((p) => p.is_active && p.slug !== "waraq")
      .map((p) => seriesPath(p.slug)),
  ]
    .flatMap((path) => localized(path))
    .concat(
      // Qirtas: every published piece, dated when it came out.
      pieces.flatMap((piece) =>
        localized(
          pieceHref(piece),
          piece.published_at ? new Date(piece.published_at) : undefined
        )
      )
    );
};

export default sitemap;
