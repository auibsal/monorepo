import "server-only";

import { bareId, type NotionPage } from "./client";
import {
  count,
  linksOf,
  outOfTime,
  problem,
  recordFor,
  type SyncContext,
  saveLink,
} from "./context";
import { importedState, markImported } from "./events";
import { mirror, type Row } from "./mirrors";
import { prop, read } from "./props";

/**
 * Needs are the site's (decisions.md, Where things live: needs and
 * requests to Student Life): listed on the event, production, Edition or
 * standing activity they are for, and sent to Student Life by the
 * Secretary. Notion's Needs rows are imported once (Nov 16, 2026), then
 * the database becomes a read-only copy the site writes.
 */

/** Notion's "For", as the site's standing activities (core.programmes). */
const FOR_SLUG: Record<string, string> = {
  "Next Stop": "next-stop",
  Qalam: "waraq",
  Qirtas: "waraq",
  "Second Chapter": "second-chapter",
  "The Company": "company",
  "Typewriter Tour": "typewriter-tour",
};
const SLUG_FOR = Object.fromEntries(
  Object.entries(FOR_SLUG)
    .filter(([name]) => name !== "Qalam")
    .map(([name, slug]) => [slug, name])
);

const STATUS_IN: Record<string, string> = {
  Draft: "listed",
  "Not provided": "not_provided",
  "Partly provided": "partly_provided",
  Provided: "provided",
  "Sent to Student Life": "requested",
};
const STATUS_OUT = Object.fromEntries(
  Object.entries(STATUS_IN).map(([name, status]) => [status, name])
);

const day = (value: string | null | undefined) =>
  value ? value.slice(0, 10) : null;

export interface NeedValues {
  for: string | null;
  item: string;
  needed_by: string | null;
  provided_note: string | null;
  purpose: string;
  quantity: number;
  requested_on: string | null;
  status: string;
}

/** What a Needs row holds; null without an item. */
export const needValues = (page: NotionPage): NeedValues | null => {
  const item = read.text(page, "Item").slice(0, 200);
  if (!item) {
    return null;
  }
  const quantity = read.number(page, "Quantity");
  const status = STATUS_IN[read.select(page, "Status") ?? ""] ?? "listed";
  const sent = day(read.date(page, "Sent on")?.start);
  return {
    for: read.select(page, "For"),
    item,
    needed_by: day(read.date(page, "Needed by")?.start),
    provided_note: read.text(page, "Answer").slice(0, 500) || null,
    purpose: read.text(page, "Purpose").slice(0, 500),
    quantity:
      quantity && Number.isInteger(quantity) && quantity > 0 ? quantity : 1,
    requested_on:
      status === "listed" ? null : (sent ?? day(page.last_edited_time)),
    status,
  };
};

const programmeIds = async (ctx: SyncContext) => {
  const { data } = await ctx.admin
    .schema("core")
    .from("programmes")
    .select("id, slug");
  return new Map((data ?? []).map((p) => [p.slug, p.id]));
};

const importNeed = async (
  ctx: SyncContext,
  page: NotionPage,
  programmes: Map<string, string>
) => {
  if (await recordFor(ctx, "need", page.id)) {
    return;
  }
  const v = needValues(page);
  if (!v) {
    return;
  }
  const [eventPage] = read.relation(page, "Event");
  const eventId = eventPage
    ? await recordFor(ctx, "event", bareId(eventPage))
    : null;
  const slug = v.for ? FOR_SLUG[v.for] : undefined;
  const provided = v.status === "provided" || v.status === "partly_provided";
  const { data, error } = await ctx.admin
    .schema("programmes")
    .from("needs")
    .insert({
      event_id: eventId,
      item: v.item,
      needed_by: v.needed_by,
      programme_id: eventId ? null : (slug && programmes.get(slug)) || null,
      provided_note: v.provided_note,
      provided_on: provided
        ? (v.requested_on ?? day(page.last_edited_time))
        : null,
      purpose: v.purpose,
      quantity: v.quantity,
      requested_on: v.requested_on,
      status: v.status,
    })
    .select("id")
    .single();
  if (error) {
    throw error;
  }
  await saveLink(ctx, "need", page.id, data.id, null);
  count(ctx, "need.imported");
};

/** Once: Notion's Needs rows, onto the site. Waits for the events. */
export const importNeeds = async (ctx: SyncContext) => {
  const state = await importedState(ctx);
  if (!(ctx.sources.needs && state.events) || state.needs) {
    return;
  }
  const [rows, programmes] = await Promise.all([
    ctx.notion.query(ctx.sources.needs),
    programmeIds(ctx),
  ]);
  const before = ctx.problems.length;
  for (const page of rows) {
    if (outOfTime(ctx)) {
      return;
    }
    try {
      // biome-ignore lint/performance/noAwaitInLoops: rate-limited, sequential
      await importNeed(ctx, page, programmes);
    } catch (error) {
      problem(
        ctx,
        `import need ${bareId(page.id)}: ${(error as Error).message}`
      );
    }
  }
  if (ctx.problems.length === before) {
    await markImported(ctx, "needs");
  }
};

interface SiteNeed {
  event_id: string | null;
  id: string;
  item: string;
  needed_by: string | null;
  programme: { slug: string } | null;
  provided_note: string | null;
  purpose: string;
  quantity: number;
  requested_on: string | null;
  status: string;
}

/** A need's copy, as Notion row properties. */
export const needProps = (
  need: SiteNeed,
  eventPage: string | undefined
): Record<string, object> => {
  const forName = need.event_id
    ? "Event"
    : (SLUG_FOR[need.programme?.slug ?? ""] ?? null);
  return {
    Answer: prop.text(need.provided_note),
    Event: prop.relation(eventPage ? [eventPage] : []),
    For: prop.select(forName),
    Item: prop.title(need.item),
    "Needed by": prop.date(need.needed_by),
    Purpose: prop.text(need.purpose),
    Quantity: prop.number(need.quantity),
    "Sent on": prop.date(need.requested_on),
    Status: prop.status(STATUS_OUT[need.status] ?? "Draft"),
  };
};

/** Every need on the site, copied to Notion's Needs database. */
export const copyNeeds = async (ctx: SyncContext) => {
  const state = await importedState(ctx);
  if (!(ctx.sources.needs && state.needs)) {
    return;
  }
  const [{ data, error }, events] = await Promise.all([
    ctx.admin
      .schema("programmes")
      .from("needs")
      .select(
        "id, item, quantity, needed_by, purpose, status, requested_on, provided_note, event_id, programme:programmes(slug)"
      ),
    linksOf(ctx, "event"),
  ]);
  if (error) {
    throw error;
  }
  const rows: Row[] = ((data ?? []) as unknown as SiteNeed[]).map((n) => ({
    key: n.id,
    props: needProps(n, events.get(n.event_id ?? "")?.notion_page_id),
  }));
  await mirror(ctx, "need", ctx.sources.needs, rows, { synced: false });
};

/** Once the import is done: the database says it is a copy. */
export const lockNeeds = async (ctx: SyncContext) => {
  const state = await importedState(ctx);
  if (!(ctx.sources.needs && state.needs) || state.needsLocked) {
    return;
  }
  const text = (content: string) => [{ text: { content }, type: "text" }];
  await ctx.notion.updateDataSource(ctx.sources.needs, {
    description: text(
      "A read-only copy the site writes: list needs on the event, production or Edition in the Diwan, where the Secretary sends them to Student Life. Anything typed here is replaced at the next sync."
    ),
    // Who asked is the site's to keep (no personal data in Notion).
    properties: { "Requested by": null },
    title: text("Needs (from the site, read-only)"),
  });
  await markImported(ctx, "needsLocked");
  count(ctx, "need.locked");
};
