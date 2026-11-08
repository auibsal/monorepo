import { project } from "@repo/config";
import type { Database } from "@repo/database";
import {
  type Locale,
  locales,
  localizedPath,
} from "@repo/internationalization";
import { content, documents, journal } from "@repo/sal-data";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";
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

const localized = (
  path: string,
  lastModified = new Date(),
  only: readonly Locale[] = locales
): MetadataRoute.Sitemap => {
  const languages: Record<string, string> = Object.fromEntries(
    only.map((locale) => [
      locale,
      new URL(localizedPath(locale, path), project.url).href,
    ])
  );
  // The page for anyone whose language isn't one of the page's: English
  // when it has an English edition, otherwise its only one.
  const fallback = languages[only.includes("en") ? "en" : String(only[0])];

  return only.map((locale) => ({
    alternates: {
      languages: { ...languages, "x-default": fallback },
    },
    lastModified,
    url: languages[locale] ?? project.url,
  }));
};

/** Published, public events: their own pages, dated by their last change. */
const publicEventPages = async (client: SupabaseClient<Database>) => {
  const { data } = await client
    .schema("events")
    .from("events")
    .select("slug, updated_at")
    .eq("status", "published")
    .eq("members_only", false);
  return (data ?? []).filter((event) => event.slug);
};

/** Editions that have come out (only those that exist). */
const publishedEditions = async (client: SupabaseClient<Database>) =>
  ((await journal.publishedIssues(client)) ?? []).filter(
    (issue) => issue.status === "published" && issue.slug
  );

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  // Rebuilt hourly, so a renamed page or a new piece appears without a
  // deploy.
  "use cache";
  cacheLife("hours");
  const [docs, pieces, eventPages, issues, editions] = await Promise.all([
    readPublished(["documents"], (c) => documents.publicDocuments(c), []),
    readPublished(["journal"], (c) => journal.publishedPieceSlugs(c), []),
    readPublished(["events"], publicEventPages, []),
    readPublished(["news"], (c) => content.sundayPaperIssues(c), []),
    readPublished(["journal"], publishedEditions, []),
  ]);
  return [
    ...staticPaths,
    ...docs.map((doc) => documents.documentPath(doc.slug)),
  ]
    .flatMap((path) => localized(path))
    .concat(
      eventPages.flatMap((event) =>
        localized(`/events/${event.slug}`, new Date(event.updated_at))
      ),
      // The Sunday Paper's issues actually sent, dated by their Sunday.
      issues.flatMap((issue) =>
        localized(`/sunday-paper/${issue.month}`, new Date(issue.sent_on))
      ),
      editions.flatMap((edition) =>
        localized(
          `/qirtas/editions/${edition.slug}`,
          new Date(edition.updated_at)
        )
      ),
      // Qirtas: every published piece, dated when it came out, in the
      // language it was written in (one language per page; bilingual
      // pieces in both). Next Stop's episodes are pieces too.
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
