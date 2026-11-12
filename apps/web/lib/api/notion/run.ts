import "server-only";

import { createAdminClient } from "@repo/database/admin";
import { revalidateTag } from "next/cache";
import { env } from "@/env";
import { diwan, origin } from "@/lib/api/urls";
import { parseError } from "@/lib/observability/error";
import { log } from "@/lib/observability/log";
import { createNotion, type Notion, type NotionUser } from "./client";
import type { Admin, Sources, SyncContext } from "./context";
import { publishDocuments, syncAdoptionRecords } from "./documents";
import { sendMinutesToDiwan } from "./minutes";
import { mirrorJournal, mirrorOfficers, peopleByEmail } from "./mirrors";
import { publishWaiting, reportStaleEvents, syncRsvpCounts } from "./publish";
import { unpublishFromNotion } from "./unpublish";

const SOURCE_KEYS = [
  "documents",
  "events",
  "journal",
  "news",
  "officers",
  "programmes",
] as const;

const setting = async (admin: Admin, key: string) => {
  const { data } = await admin
    .schema("core")
    .from("settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? null;
};

const sourcesFrom = (value: unknown): Sources | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const v = value as Record<string, unknown>;
  if (!SOURCE_KEYS.every((k) => typeof v[k] === "string")) {
    return null;
  }
  return {
    ...(v as unknown as Sources),
    meetings: typeof v.meetings === "string" ? v.meetings : undefined,
  };
};

export interface SyncState {
  at: string;
  counts: Record<string, number>;
  ms: number;
  problems: string[];
}

/**
 * Everything one sync does, in order (Nov 4, 2026): the read-only copies
 * (officers, Qirtas's counts), then what Notion authors (events,
 * documents and their adoption record,
 * minutes), then the RSVP counts. Nothing is made in the Diwan and copied
 * back: events and minutes are written in Notion only (decisions §8).
 */
const steps: [
  string,
  (ctx: SyncContext, users: NotionUser[]) => Promise<void>,
][] = [
  ["officers", (ctx, users) => mirrorOfficers(ctx, peopleByEmail(users))],
  ["journal", (ctx) => mirrorJournal(ctx)],
  ["publishing", (ctx) => publishWaiting(ctx)],
  [
    "documents",
    (ctx) => publishDocuments(ctx, { all: ctx.resyncDocuments === true }),
  ],
  ["adoption", (ctx) => syncAdoptionRecords(ctx)],
  ["off the site", (ctx) => unpublishFromNotion(ctx)],
  ["minutes", (ctx) => sendMinutesToDiwan(ctx)],
  ["rsvps", (ctx) => syncRsvpCounts(ctx)],
  [
    "stale events",
    (ctx, users) =>
      reportStaleEvents(
        ctx,
        new Set(users.filter((u) => u.type === "bot").map((u) => u.id))
      ),
  ],
];

export const runNotionSync = async (
  notion: Notion | null = env.NOTION_TOKEN
    ? createNotion(env.NOTION_TOKEN)
    : null,
  { resyncDocuments = false }: { resyncDocuments?: boolean } = {}
): Promise<SyncState | { skipped: string }> => {
  if (!notion) {
    return { skipped: "NOTION_TOKEN is not set" };
  }
  const admin = createAdminClient();
  const sources = sourcesFrom(await setting(admin, "notion.data_sources"));
  if (!sources) {
    return { skipped: "notion.data_sources is not set" };
  }
  const started = Date.now();
  const ctx: SyncContext = {
    admin,
    // English Diwan pages (no language prefix): <origin>/diwan.
    appUrl: diwan("en"),
    counts: {},
    deadline: started + 45_000,
    notion,
    problems: [],
    resyncDocuments,
    sources,
    webUrl: origin(),
  };

  let users: NotionUser[] = [];
  try {
    users = await notion.users();
  } catch (error) {
    ctx.problems.push(`users: ${parseError(error)}`);
  }
  // Each step stands alone: one failing (a renamed property, a page not
  // shared with the connection) does not stop the rest.
  for (const [name, step] of steps) {
    try {
      // biome-ignore lint/performance/noAwaitInLoops: steps share Notion's rate limit
      await step(ctx, users);
    } catch (error) {
      ctx.problems.push(`${name}: ${parseError(error)}`);
    }
  }

  // What the sync changed shows at once, not only after the outbox runs.
  // Outside a request (a script or a test) there is no cache to refresh.
  for (const tag of ["events", "documents", "about"] as const) {
    try {
      revalidateTag(tag, "max");
    } catch {
      break;
    }
  }

  const state: SyncState = {
    at: new Date().toISOString(),
    counts: ctx.counts,
    ms: Date.now() - started,
    problems: ctx.problems.slice(0, 20),
  };
  await admin
    .schema("core")
    .from("settings")
    .update({ value: state as never })
    .eq("key", "notion.sync_state");
  if (ctx.problems.length > 0) {
    log.warn(`Notion sync: ${ctx.problems.length} problem(s)`, {
      first: ctx.problems[0] ?? "",
    });
  }
  return state;
};

export interface AccessLists {
  /** Holders of a role that opens Notion, with no Notion account under their address. */
  invite: { email: string; name: string; roles: string[]; user_id: string }[];
  /** Notion members who hold no role that opens Notion. */
  remove: { email: string; name: string }[];
}

/**
 * Who should be in the workspace: everyone holding a role that opens
 * Notion (`access.roles.in_notion`; not partners, parents or Qalam
 * students), matched to the workspace's members by address. Notion's API
 * cannot invite or remove; the invitation goes by email with the role.
 */
export const accessLists = async (notion: Notion): Promise<AccessLists> => {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const [{ data: officers, error }, held, users] = await Promise.all([
    admin.schema("access").rpc("officer_directory"),
    admin
      .schema("access")
      .from("role_assignments")
      .select("user_id, roles!inner(in_notion)")
      .eq("roles.in_notion", true)
      .lte("starts_at", now)
      .or(`ends_at.is.null,ends_at.gt.${now}`),
    notion.users(),
  ]);
  if (error ?? held.error) {
    throw error ?? held.error;
  }
  const opensNotion = new Set((held.data ?? []).map((a) => a.user_id));
  const team = (officers ?? []).filter(
    (o) => o.email && o.user_id && opensNotion.has(o.user_id)
  );
  const people = users.filter((u) => u.type === "person" && u.person?.email);
  const inNotion = new Set(
    people.map((u) => (u.person?.email ?? "").toLowerCase())
  );
  const teamEmails = new Set(team.map((o) => (o.email ?? "").toLowerCase()));
  return {
    invite: team
      .filter((o) => !inNotion.has((o.email ?? "").toLowerCase()))
      .map((o) => ({
        email: o.email ?? "",
        name: o.full_name_en?.trim() || (o.email ?? ""),
        roles: o.roles ?? [],
        user_id: o.user_id ?? "",
      })),
    remove: people
      .filter((u) => !teamEmails.has((u.person?.email ?? "").toLowerCase()))
      .map((u) => ({ email: u.person?.email ?? "", name: u.name ?? "" })),
  };
};

export const readSyncState = async () =>
  (await setting(createAdminClient(), "notion.sync_state")) as SyncState | null;

export const homeUrl = async () => {
  const value = await setting(createAdminClient(), "notion.home_url");
  return typeof value === "string" ? value : null;
};

/** The workspace's invite link, if set (core.settings `notion.invite_link`). */
export const inviteLink = async () => {
  const value = await setting(createAdminClient(), "notion.invite_link");
  return typeof value === "string" && value.startsWith("https://")
    ? value
    : null;
};

/** When the one-time invitations went out (`notion.catch_up_sent_at`). */
export const catchUpSentAt = async () => {
  const value = await setting(createAdminClient(), "notion.catch_up_sent_at");
  return typeof value === "string" ? value : null;
};
