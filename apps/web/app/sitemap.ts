import { project } from "@repo/config";
import { locales, localizedPath } from "@repo/internationalization";
import { documents, programmes } from "@repo/sal-data";
import type { MetadataRoute } from "next";
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
  "/events/next-stop/care",
  "/events",
  "/documents",
  "/governance",
  "/partners",
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
  const [docs, series] = await Promise.all([
    readPublished(["documents"], (c) => documents.publicDocuments(c), []),
    readPublished(["programmes"], (c) => programmes.programmes(c), []),
  ]);
  return [
    ...staticPaths,
    ...docs.map((doc) => `/documents/${doc.slug}`),
    // Each program's own calendar (Qirtas, the paper, has its own pages).
    ...(series ?? [])
      .filter((p) => p.is_active && p.slug !== "waraq")
      .map((p) => `/events/${p.slug}`),
  ].flatMap(localized);
};

export default sitemap;
