import "server-only";

import { bareId, type NotionPage } from "./client";
import {
  count,
  linksOf,
  outOfTime,
  problem,
  type SyncContext,
} from "./context";
import { prop, read } from "./props";
import { stamp } from "./publish";

/**
 * Statuses that mean "not on the site". A published document set back to
 * one of them in Notion, or trashed there, comes off the Library (audit
 * A3): it is hidden, the row's "Public page" is cleared and its Platform
 * note says so. Events are the site's (decisions.md, Events): Notion's
 * Events rows are a copy, and nothing there takes one off the site.
 */
const OFF_SITE = new Set([
  "Idea",
  "Planning",
  "Draft",
  "Retired",
  "Needs changes",
]);

export const takenOffNote = (why: string) =>
  `Taken off the site ${stamp()} (${why}). Set Ready to publish to bring it back.`;

/** Whether a linked row says its record should not be on the site. */
export const offSite = (page: NotionPage | undefined) =>
  !page || OFF_SITE.has(read.select(page, "Status") ?? "");

const reasonOf = (page: NotionPage | undefined) =>
  page
    ? `Status set to ${read.select(page, "Status") ?? "none"}`
    : "the row was deleted in Notion";

const rowsById = (pages: NotionPage[]) =>
  new Map(pages.map((p) => [bareId(p.id), p]));

const markRow = async (
  ctx: SyncContext,
  pageId: string | undefined,
  why: string
) => {
  if (!pageId) {
    return;
  }
  await ctx.notion
    .updatePage(pageId, {
      "Platform note": prop.text(takenOffNote(why)),
      "Public page": prop.url(null),
    })
    .catch(() => undefined);
};

/** Takes a document off the Library. */
const hide = (ctx: SyncContext, id: string) =>
  ctx.admin
    .schema("api")
    .from("society_documents")
    .update({ on_site: false })
    .eq("id", id);

const takeOff = async (
  ctx: SyncContext,
  live: Set<string>,
  rows: Map<string, NotionPage>
) => {
  const links = await linksOf(ctx, "document");
  for (const [recordId, link] of links) {
    if (outOfTime(ctx)) {
      return;
    }
    if (!live.has(recordId)) {
      continue;
    }
    const page = rows.get(bareId(link.notion_page_id));
    if (!offSite(page)) {
      continue;
    }
    try {
      // biome-ignore lint/performance/noAwaitInLoops: rate-limited, sequential
      const { error } = await hide(ctx, recordId);
      if (error) {
        throw error;
      }
      await markRow(
        ctx,
        page ? link.notion_page_id : undefined,
        reasonOf(page)
      );
      count(ctx, "document.taken_off");
    } catch (error) {
      problem(
        ctx,
        `take off document ${recordId}: ${(error as Error).message}`
      );
    }
  }
};

/**
 * Brings the Library in line with Notion's statuses: a document live on
 * the site but no longer Published there (or gone from Notion) comes off.
 */
export const unpublishFromNotion = async (ctx: SyncContext) => {
  const [documentRows, documents] = await Promise.all([
    ctx.notion.query(ctx.sources.documents),
    ctx.admin
      .schema("api")
      .from("society_documents")
      .select("id")
      .eq("on_site", true),
  ]);
  await takeOff(
    ctx,
    new Set((documents.data ?? []).map((d) => d.id)),
    rowsById(documentRows)
  );
};
