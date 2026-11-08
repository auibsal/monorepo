import "server-only";

import { bareId, type NotionPage } from "./client";
import {
  count,
  type LinkKind,
  linksOf,
  outOfTime,
  problem,
  type SyncContext,
} from "./context";
import { prop, read } from "./props";
import { stamp } from "./publish";

/**
 * Statuses that mean "not on the site". A published event or document set
 * back to one of them in Notion, or trashed there, comes off the site
 * (audit A3): the event becomes a draft, the document is hidden, the row's
 * "Public page" is cleared and its Platform note says so, for the English
 * row and its Arabic edition alike.
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

/** Hides one record: an event becomes a draft, a document leaves the Library. */
const hide = (
  ctx: SyncContext,
  kind: Extract<LinkKind, "event" | "document">,
  id: string
) =>
  kind === "event"
    ? ctx.admin
        .schema("events")
        .from("events")
        .update({ status: "draft" })
        .eq("id", id)
    : ctx.admin
        .schema("governance")
        .from("society_documents")
        .update({ on_site: false })
        .eq("id", id);

const takeOff = async (
  ctx: SyncContext,
  kind: Extract<LinkKind, "event" | "document">,
  live: Set<string>,
  rows: Map<string, NotionPage>
) => {
  const [links, editions] = await Promise.all([
    linksOf(ctx, kind),
    linksOf(ctx, kind === "event" ? "event_ar" : "document"),
  ]);
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
      const { error } = await hide(ctx, kind, recordId);
      if (error) {
        throw error;
      }
      const why = reasonOf(page);
      await markRow(ctx, page ? link.notion_page_id : undefined, why);
      if (kind === "event") {
        await markRow(ctx, editions.get(recordId)?.notion_page_id, why);
      }
      count(ctx, `${kind}.taken_off`);
    } catch (error) {
      problem(ctx, `take off ${kind} ${recordId}: ${(error as Error).message}`);
    }
  }
};

/**
 * Brings the site in line with Notion's statuses: whatever is live on the
 * site but no longer Published there (or gone from Notion) comes off.
 */
export const unpublishFromNotion = async (ctx: SyncContext) => {
  const [eventRows, documentRows, events, documents] = await Promise.all([
    ctx.notion.query(ctx.sources.events),
    ctx.notion.query(ctx.sources.documents),
    ctx.admin
      .schema("events")
      .from("events")
      .select("id")
      .eq("status", "published"),
    ctx.admin
      .schema("governance")
      .from("society_documents")
      .select("id")
      .eq("on_site", true),
  ]);
  await takeOff(
    ctx,
    "event",
    new Set((events.data ?? []).map((e) => e.id)),
    rowsById(eventRows)
  );
  await takeOff(
    ctx,
    "document",
    new Set((documents.data ?? []).map((d) => d.id)),
    rowsById(documentRows)
  );
};
