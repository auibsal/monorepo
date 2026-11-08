import "server-only";

import type { NotionUser } from "./client";
import {
  count,
  dropLink,
  hashOf,
  isGone,
  type Link,
  type LinkKind,
  linksOf,
  outOfTime,
  problem,
  type SyncContext,
  saveLink,
} from "./context";
import { prop } from "./props";

/**
 * Read-only copies in Notion ("From the site (read-only)"): the officers
 * and Qirtas's counts. Each row is written only when it changed (by hash)
 * and removed from Notion when its record is gone. Nothing here is read
 * back: the Diwan stays the source. Programs and documents are written in
 * Notion since Nov 4, 2026 (programs.ts, documents.ts).
 */
interface Row {
  key: string;
  props: Record<string, object>;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Writes one row: updates its page, or creates one (again, if deleted). */
const writeRow = async (
  ctx: SyncContext,
  kind: LinkKind,
  dataSourceId: string,
  row: Row,
  link: Link | undefined
) => {
  const contentHash = hashOf(row.props);
  if (link?.content_hash === contentHash) {
    return;
  }
  const props = { ...row.props, Synced: prop.date(today()) };
  if (link) {
    try {
      await ctx.notion.updatePage(link.notion_page_id, props);
      await saveLink(ctx, kind, link.notion_page_id, row.key, contentHash);
      count(ctx, `${kind}.updated`);
      return;
    } catch (error) {
      if (!isGone(error)) {
        throw error;
      }
      // Someone deleted the copy in Notion: write it again.
    }
  }
  const page = await ctx.notion.createPage(dataSourceId, props);
  await saveLink(ctx, kind, page.id, row.key, contentHash);
  count(ctx, `${kind}.created`);
};

/** Removes the copy of a record that no longer exists in the Diwan. */
const removeRow = async (
  ctx: SyncContext,
  kind: LinkKind,
  key: string,
  link: Link
) => {
  try {
    await ctx.notion.trashPage(link.notion_page_id);
  } catch (error) {
    if (!isGone(error)) {
      problem(ctx, `${kind} ${key}: ${(error as Error).message}`);
      return;
    }
  }
  await dropLink(ctx, link.notion_page_id);
  count(ctx, `${kind}.removed`);
};

const mirror = async (
  ctx: SyncContext,
  kind: LinkKind,
  dataSourceId: string,
  rows: Row[]
) => {
  const links = await linksOf(ctx, kind);
  const keep = new Set(rows.map((r) => r.key));

  // One at a time: Notion allows about three requests a second.
  for (const row of rows) {
    if (outOfTime(ctx)) {
      return;
    }
    try {
      // biome-ignore lint/performance/noAwaitInLoops: rate-limited, sequential
      await writeRow(ctx, kind, dataSourceId, row, links.get(row.key));
    } catch (error) {
      problem(ctx, `${kind} ${row.key}: ${(error as Error).message}`);
    }
  }
  for (const [key, link] of links) {
    if (keep.has(key) || outOfTime(ctx)) {
      continue;
    }
    // biome-ignore lint/performance/noAwaitInLoops: rate-limited, sequential
    await removeRow(ctx, kind, key, link);
  }
};

const app = (ctx: SyncContext, path: string) => `${ctx.appUrl}${path}`;

/** Notion members by AUIB address, to fill the People column. */
export const peopleByEmail = (users: NotionUser[]) =>
  new Map(
    users
      .filter((u) => u.type === "person" && u.person?.email)
      .map((u) => [(u.person?.email ?? "").toLowerCase(), u.id])
  );

const day = (value: string | null) => (value ? value.slice(0, 10) : null);

/**
 * The Council's nine seats (decisions §4), the options of the Officers
 * database's Roles: the Executive Board and the six directors. A role that
 * is not a seat (an event lead, a section editor) is not listed there.
 */
const SEATS = [
  "President",
  "Vice President",
  "General Secretary",
  "Editor-in-Chief",
  "Director of Media",
  "Artistic Director",
  "Director of Events",
  "Director of Partnerships",
  "Director of Membership",
] as const;

const seatsOf = (roles: readonly string[] | null) =>
  SEATS.filter((seat) => (roles ?? []).includes(seat));

export const mirrorOfficers = async (
  ctx: SyncContext,
  people: ReadonlyMap<string, string>
) => {
  const { data, error } = await ctx.admin
    .schema("access")
    .rpc("officer_directory");
  if (error) {
    throw error;
  }
  await mirror(
    ctx,
    "officer",
    ctx.sources.officers,
    (data ?? []).map((o) => {
      // The address only finds the officer's Notion account; Notion is never
      // given it (decisions §8: no personal data in Notion).
      const person = people.get((o.email ?? "").toLowerCase());
      return {
        key: o.user_id,
        props: {
          Council: prop.checkbox(o.council === true),
          Diwan: prop.url(app(ctx, `/membership/${o.user_id}`)),
          "Diwan ID": prop.text(o.user_id),
          Name: prop.title(o.full_name_en?.trim() ?? ""),
          "Name (Arabic)": prop.text(o.full_name_ar),
          "Notion person": prop.people(person ? [person] : []),
          Roles: prop.multi(seatsOf(o.roles)),
          "Term ends": prop.date(day(o.term_ends)),
          "Term starts": prop.date(day(o.term_starts)),
        },
      };
    })
  );
};

/** Stage names in the order a submission moves through them. */
const STAGES = [
  ["received", "Received"],
  ["intake_check", "Intake check"],
  ["in_review", "In review"],
  ["third_read", "Third read"],
  ["selection", "Selection"],
  ["accepted", "Accepted"],
  ["declined", "Declined"],
  ["withdrawn", "Withdrawn"],
] as const;

/**
 * Counts per stage for calls that are open or closed in the last 90 days.
 * Only numbers leave the Diwan: no titles, no authors (review is blind).
 */
export const mirrorJournal = async (ctx: SyncContext) => {
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data: calls, error } = await ctx.admin
    .schema("journal")
    .from("calls")
    .select("id, title_en, closes_at")
    .gte("closes_at", since);
  if (error) {
    throw error;
  }
  const rows: Row[] = [];
  for (const call of calls ?? []) {
    // biome-ignore lint/performance/noAwaitInLoops: a few calls at most
    const { data: subs } = await ctx.admin
      .schema("journal")
      .from("submissions")
      .select("status")
      .eq("call_id", call.id);
    const tally = new Map<string, number>();
    for (const s of subs ?? []) {
      tally.set(s.status, (tally.get(s.status) ?? 0) + 1);
    }
    STAGES.forEach(([stage, label], index) => {
      rows.push({
        key: `${call.id}:${stage}`,
        props: {
          Call: prop.text(call.title_en),
          Closes: prop.date(day(call.closes_at)),
          Count: prop.number(tally.get(stage) ?? 0),
          Diwan: prop.url(app(ctx, "/qirtas")),
          "Diwan ID": prop.text(`${call.id}:${stage}`),
          Order: prop.number(index + 1),
          Stage: prop.title(label),
        },
      });
    });
  }
  // Qirtas: News, Video and Voices work in each stage, and every desk's
  // pieces by stage of the newsroom (counts only; no titles or names).
  const [{ data: named }, { data: pieces }] = await Promise.all([
    ctx.admin
      .schema("journal")
      .from("submissions")
      .select("desk, status")
      .is("call_id", null),
    ctx.admin.schema("journal").from("pieces").select("desk, status"),
  ]);
  for (const desk of ["news", "voices", "video", "games"] as const) {
    const tally = new Map<string, number>();
    for (const s of (named ?? []).filter((x) => x.desk === desk)) {
      tally.set(s.status, (tally.get(s.status) ?? 0) + 1);
    }
    STAGES.forEach(([stage, label], index) => {
      rows.push({
        key: `desk:${desk}:${stage}`,
        props: {
          Call: prop.text(`${DESK_LABEL[desk]} desk`),
          Closes: prop.date(null),
          Count: prop.number(tally.get(stage) ?? 0),
          Diwan: prop.url(app(ctx, "/qirtas")),
          "Diwan ID": prop.text(`desk:${desk}:${stage}`),
          Order: prop.number(index + 1),
          Stage: prop.title(label),
        },
      });
    });
  }
  for (const desk of Object.keys(DESK_LABEL) as (keyof typeof DESK_LABEL)[]) {
    PIECE_STAGES.forEach(([stage, label], index) => {
      rows.push({
        key: `pieces:${desk}:${stage}`,
        props: {
          Call: prop.text(`${DESK_LABEL[desk]} pieces`),
          Closes: prop.date(null),
          Count: prop.number(
            (pieces ?? []).filter((p) => p.desk === desk && p.status === stage)
              .length
          ),
          Diwan: prop.url(app(ctx, "/qirtas")),
          "Diwan ID": prop.text(`pieces:${desk}:${stage}`),
          Order: prop.number(index + 1),
          Stage: prop.title(label),
        },
      });
    });
  }
  await mirror(ctx, "journal_stage", ctx.sources.journal, rows);
};

const DESK_LABEL = {
  gallery: "Gallery",
  games: "Games",
  letters: "Letters",
  news: "News",
  video: "Video",
  voices: "Voices",
} as const;

const PIECE_STAGES = [
  ["editing", "Editing"],
  ["author_approved", "Author approved"],
  ["approved", "Approved"],
  ["scheduled", "Scheduled"],
  ["published", "Published"],
] as const;
