import { project } from "@repo/config";
import { locales, localizedPath } from "@repo/internationalization";
import { documents } from "@repo/sal-data";
import type { MetadataRoute } from "next";
import { readPublished } from "@/lib/supabase";

/**
 * Only pages that exist, each with its Arabic/English alternates. Pages are
 * added here as they are built; members-only content never appears.
 */
const staticPaths = [
  "",
  "/about",
  "/programs",
  "/qirtas",
  "/qirtas/news",
  "/qirtas/letters",
  "/qirtas/gallery",
  "/qirtas/video",
  "/qirtas/voices",
  "/qirtas/editions",
  "/qirtas/games",
  "/qirtas/games/word",
  "/qirtas/games/search",
  "/newsletter",
  "/join",
  "/give",
  "/contact",
  "/media-kit",
  "/privacy",
  "/programs/side-quest/care",
  "/events",
  "/documents",
  "/governance",
  "/partners",
  "/programs/productions",
];

const localized = (path: string): MetadataRoute.Sitemap => {
  const languages = Object.fromEntries(
    locales.map((locale) => [
      locale,
      new URL(localizedPath(locale, path), project.url).href,
    ])
  );

  return locales.map((locale) => ({
    alternates: { languages },
    lastModified: new Date(),
    url: languages[locale] ?? project.url,
  }));
};

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const docs = await readPublished(
    ["documents"],
    (c) => documents.publicDocuments(c),
    []
  );
  return [
    ...staticPaths,
    ...docs.map((doc) => `/documents/${doc.slug}`),
  ].flatMap(localized);
};

export default sitemap;
