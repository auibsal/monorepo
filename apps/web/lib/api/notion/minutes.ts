import "server-only";

import { type governance, sanitizeRichText } from "@/lib/data";
import { pageHtml } from "./blocks";
import { bareId, type NotionPage } from "./client";
import {
  count,
  hashOf,
  linksOf,
  outOfTime,
  problem,
  recordFor,
  type SyncContext,
  saveLink,
} from "./context";
import { prop, read } from "./props";
import { bodyOf, editorEmail, NO_EMAIL, stamp } from "./publish";

/**
 * Minutes are written in Notion, in Work, Meetings (decisions.md).
 * When a meeting's Status is "Minutes in the
 * Diwan", the platform copies the page into the Diwan as that meeting's
 * minutes, where the Council adopts them. Once adopted, the official copy
 * is locked (the database refuses any change to adopted minutes), and the
 * Notion page says so. Until then, editing the page updates the draft.
 * The meeting itself is an event (decisions.md): Event links its row
 * in Events, and the minutes point at it in the Diwan.
 */

const IN_THE_DIWAN = "Minutes in the Diwan";
const UUID = /^[0-9a-f-]{36}$/iu;

/** Notion's meeting kinds (decisions.md). */
const BODIES: Record<string, governance.MeetingBody> = {
  "Annual Meeting": "annual",
  Council: "council",
  "Founding Meeting": "founding",
  "General meeting": "general",
  "Special meeting": "special",
};

const publisherFor = async (ctx: SyncContext, email: string) => {
  const { data } = await ctx.admin.schema("access").rpc("notion_publisher", {
    email,
    permission: "governance.manage",
    scope_type: "global",
  });
  return (data as string | null) ?? null;
};

/** Says what to fix in the page's note and a comment; the Status stays. */
const refuse = async (
  ctx: SyncContext,
  page: NotionPage,
  problems: string[]
) => {
  const note = `Not sent to the Diwan (${stamp()}): ${problems.join(" ")}`;
  await ctx.notion.updatePage(page.id, { "Platform note": prop.text(note) });
  await ctx.notion.comment(page.id, note);
  count(ctx, "minutes.refused");
};

interface Draft {
  body: governance.MeetingBody;
  event_id: string | null;
  meeting_on: string;
  text_ar?: string;
  text_en: string;
  title_ar?: string;
  title_en: string;
}

/** The meeting event's day in Baghdad (the database sets it again). */
const eventDay = async (ctx: SyncContext, eventId: string | null) => {
  if (!eventId) {
    return null;
  }
  const { data } = await ctx.admin
    .schema("events")
    .from("events")
    .select("starts_at")
    .eq("id", eventId)
    .maybeSingle();
  return data
    ? new Date(data.starts_at).toLocaleDateString("en-CA", {
        timeZone: "Asia/Baghdad",
      })
    : null;
};

/** What the page holds, or what is missing. */
const readDraft = async (
  ctx: SyncContext,
  page: NotionPage
): Promise<{ draft: Draft } | { problems: string[] }> => {
  const problems: string[] = [];
  const body = BODIES[read.select(page, "Body") ?? ""];
  if (!body) {
    problems.push(
      "Set Body (Council, General meeting, Annual Meeting, Special meeting or Founding Meeting) to send minutes to the Diwan."
    );
  }
  // A meeting is an event (decisions.md): link its row in Events,
  // published in the Diwan, and its day sets the meeting's date.
  const linked = read.relation(page, "Event");
  if (linked.length > 1) {
    problems.push("Link one meeting event in Event.");
  }
  const eventId = linked[0] ? await recordFor(ctx, "event", linked[0]) : null;
  if (linked[0] && !eventId) {
    problems.push(
      "Publish the meeting's event (Event) first; its day becomes the meeting's date."
    );
  }
  const meetingOn = read.date(page, "When")?.start?.slice(0, 10) ?? null;
  if (!(meetingOn || eventId)) {
    problems.push("Link the meeting's event in Event, or set When to its day.");
  }
  const title = read.text(page, "Name");
  if (!title) {
    problems.push("Add the meeting's name.");
  }
  const text = body ? await bodyOf(ctx, page) : null;
  if (body && !text) {
    problems.push("Write the minutes in the page.");
  }
  const day = meetingOn ?? (await eventDay(ctx, eventId));
  if (problems.length > 0 || !(body && day && text)) {
    return { problems };
  }
  const arabic = await arabicMinutes(ctx, page);
  return {
    draft: {
      body,
      event_id: eventId,
      meeting_on: day,
      text_en: text,
      title_en: title,
      ...(arabic ? { text_ar: arabic.text, title_ar: arabic.title } : {}),
    },
  };
};

const ARABIC = /[\u0600-\u06FF]/u;

/**
 * The Arabic minutes (decisions §13): kept as a sub-page of the English
 * minutes' page in Meetings, sent with them as their Arabic edition. The
 * sub-page whose title is in Arabic is the one.
 */
const arabicMinutes = async (ctx: SyncContext, page: NotionPage) => {
  const blocks = await ctx.notion.blocksWithTables(page.id);
  const child = blocks.find((block) => {
    const title = (block.child_page as { title?: string } | undefined)?.title;
    return block.type === "child_page" && Boolean(title && ARABIC.test(title));
  });
  if (!child) {
    return null;
  }
  const html = pageHtml(await ctx.notion.blocksWithTables(child.id));
  const text = html ? sanitizeRichText(html) : null;
  const title = (child.child_page as { title?: string }).title ?? "";
  return text ? { text, title } : null;
};

const sendMinutes = async (
  ctx: SyncContext,
  page: NotionPage,
  email: string,
  existing: { id: string } | null,
  draft: Draft,
  marker: string
) => {
  const publisher = await publisherFor(ctx, email);
  if (!publisher) {
    await refuse(ctx, page, [
      `${email} does not hold governance.manage in the Diwan. Ask the General Secretary to set Minutes in the Diwan.`,
    ]);
    return;
  }
  const minutes = ctx.admin.schema("governance").from("minutes");
  const { data, error } = existing
    ? await minutes.update(draft).eq("id", existing.id).select("id").single()
    : await minutes
        .insert({ ...draft, created_by: publisher, status: "draft" })
        .select("id")
        .single();
  if (error) {
    throw error;
  }
  await saveLink(ctx, "minutes", page.id, data.id, marker);
  await ctx.notion.updatePage(page.id, {
    "Diwan ID": prop.text(data.id),
    "Minutes (Diwan)": prop.url(`${ctx.appUrl}/council/meetings/${data.id}`),
    "Platform note": prop.text(
      `In the Diwan since ${stamp()}, waiting for the Council to adopt them. Changes here update the draft until then.`
    ),
  });
  count(ctx, existing ? "minutes.updated" : "minutes.sent");
};

const lockedNote = async (
  ctx: SyncContext,
  page: NotionPage,
  id: string,
  adoptedOn: string | null
) => {
  await ctx.notion.updatePage(page.id, {
    "Platform note": prop.text(
      `Adopted${adoptedOn ? ` on ${adoptedOn}` : ""}. The official copy is locked in the Diwan; this page is the working copy.`
    ),
  });
  await saveLink(ctx, "minutes", page.id, id, `locked:${id}`);
  count(ctx, "minutes.locked");
};

interface MinutesLink {
  key: string;
  l: { content_hash: string | null };
}

/** One meeting page: locked, refused, unchanged or sent. */
const handleMeeting = async (
  ctx: SyncContext,
  page: NotionPage,
  link: MinutesLink | undefined
) => {
  if (link && link.l.content_hash === `locked:${link.key}`) {
    return;
  }
  const { data: existing } =
    link && UUID.test(link.key)
      ? await ctx.admin
          .schema("governance")
          .from("minutes")
          .select("id, status, adopted_on")
          .eq("id", link.key)
          .maybeSingle()
      : { data: null };
  if (existing?.status === "approved") {
    await lockedNote(ctx, page, existing.id, existing.adopted_on);
    return;
  }
  const result = await readDraft(ctx, page);
  // The text decides, not the page's edit time (our own notes edit it).
  const marker =
    "draft" in result ? hashOf(result.draft) : hashOf(result.problems);
  if (link?.l.content_hash === marker) {
    return;
  }
  if (!("draft" in result)) {
    await refuse(ctx, page, result.problems);
    // Remember the refusal so it is said once, not on every run.
    await saveLink(
      ctx,
      "minutes",
      page.id,
      link?.key ?? `refused:${bareId(page.id)}`,
      marker
    );
    return;
  }
  const email = await editorEmail(ctx, page);
  if (!email) {
    await refuse(ctx, page, [NO_EMAIL]);
    return;
  }
  await sendMinutes(ctx, page, email, existing, result.draft, marker);
};

export const sendMinutesToDiwan = async (ctx: SyncContext) => {
  if (!ctx.sources.meetings) {
    return;
  }
  const [pages, links] = await Promise.all([
    ctx.notion.query(ctx.sources.meetings, {
      property: "Status",
      select: { equals: IN_THE_DIWAN },
    }),
    linksOf(ctx, "minutes"),
  ]);
  const byPage = new Map(
    [...links.entries()].map(([key, l]) => [l.notion_page_id, { key, l }])
  );
  for (const page of pages) {
    if (outOfTime(ctx)) {
      return;
    }
    try {
      // biome-ignore lint/performance/noAwaitInLoops: rate-limited, sequential
      await handleMeeting(ctx, page, byPage.get(bareId(page.id)));
    } catch (error) {
      problem(ctx, `minutes ${bareId(page.id)}: ${(error as Error).message}`);
    }
  }
};
