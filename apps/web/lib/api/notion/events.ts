import "server-only";

import { bareId, type NotionPage, type NotionUser } from "./client";
import {
  count,
  linksOf,
  outOfTime,
  problem,
  recordFor,
  type SyncContext,
  saveLink,
} from "./context";
import { mirror, peopleByEmail, type Row } from "./mirrors";
import { prop, read, SLUG, slugify, toInstant } from "./props";
import { bodyOf, copyImage } from "./publish";
import { languageOf } from "./rules";

/**
 * Events are the site's (decisions.md, Events; Where things live): made
 * and edited only in the Diwan. Notion's Events database is a read-only
 * copy the site writes for planning pages to link to: title, dates,
 * venue, status, access, lead, the public link and the Diwan link, one row
 * per language. Nothing typed there is read.
 *
 * Once, before the copy starts, the import brings over what only Notion
 * held (Nov 16, 2026): the rows never published (made here as drafts,
 * with their text and image), each event's lead (matched by address),
 * its host and its debrief link, and the Arabic of each Arabic row.
 * `notion.imported` records when each part finished.
 */

const IMPORTED = "notion.imported";

export interface Imported {
  events?: string;
  eventsLocked?: string;
  needs?: string;
  needsLocked?: string;
}

export const importedState = async (ctx: SyncContext): Promise<Imported> => {
  const { data } = await ctx.admin
    .schema("api")
    .from("settings")
    .select("value")
    .eq("key", IMPORTED)
    .maybeSingle();
  return (data?.value ?? {}) as Imported;
};

export const markImported = async (ctx: SyncContext, part: keyof Imported) => {
  const now = await importedState(ctx);
  const { error } = await ctx.admin
    .schema("api")
    .from("settings")
    .upsert({
      description:
        "When the one-time import from Notion finished, for events and for needs (Nov 16, 2026); the read-only copies start after it.",
      is_public: false,
      key: IMPORTED,
      value: { ...now, [part]: new Date().toISOString() },
    });
  if (error) {
    throw error;
  }
};

// ── Reading a row ────────────────────────────────────────────────────────────

/** Notion's old Access, read once at the import (Members became Members only). */
const WAYS_IN = {
  Members: "rsvp",
  Open: "open",
  Private: "invite",
  RSVP: "rsvp",
} as const;
type Entry = (typeof WAYS_IN)[keyof typeof WAYS_IN];

const CLASS_ORDER = ["member", "associate", "honorary", "guest"] as const;
const CLASS_NAMES: Record<(typeof CLASS_ORDER)[number], string> = {
  associate: "Associate Members",
  guest: "Guests",
  honorary: "Honorary Members",
  member: "Members",
};

/**
 * Access as the copy shows it (decisions.md, Events: Access): "Invited
 * only", or who can come and how ("Everyone · Booking required", "Members
 * only · Open").
 */
export const accessLabel = (event: { classes: string[]; entry: string }) => {
  if (event.entry === "invite") {
    return "Invited only";
  }
  const how = event.entry === "open" ? "Open" : "Booking required";
  const names = CLASS_ORDER.filter((c) => event.classes.includes(c)).map(
    (c) => CLASS_NAMES[c]
  );
  const list = new Intl.ListFormat("en-US", { type: "conjunction" });
  if (names.length === CLASS_ORDER.length) {
    return `Everyone · ${how}`;
  }
  const who = names.length === 1 ? `${names[0]} only` : list.format(names);
  return `${who} · ${how}`;
};

const STATUS: Record<string, string> = {
  canceled: "Canceled",
  draft: "Planning",
  published: "Published",
};

const THE_SOCIETY = /^the society$/iu;

export interface RowValues {
  capacity: number | null;
  /** Who can come: Notion's Members became Members only. */
  classes: string[] | null;
  debrief: string | null;
  ends_at: string | null;
  entry: Entry;
  host: string | null;
  off_campus: boolean;
  slug: string;
  starts_at: string;
  summary: string | null;
  title: string;
  venue: string | null;
}

const entryOf = (page: NotionPage): Entry => {
  const chosen = read.select(page, "Access") ?? read.select(page, "Way in");
  return chosen && chosen in WAYS_IN
    ? WAYS_IN[chosen as keyof typeof WAYS_IN]
    : "rsvp";
};

const wholeNumber = (n: number | null) =>
  n !== null && Number.isInteger(n) && n > 0 ? n : null;

/**
 * What an event row holds, read leniently: the import makes drafts, which
 * staff finish in the Diwan. Null without a start time.
 */
export const rowValues = (
  page: NotionPage,
  title = read.text(page, "Title")
): RowValues | null => {
  const when = read.date(page, "When");
  const startsAt = toInstant(when?.start);
  if (!(startsAt && title)) {
    return null;
  }
  const endsAt = toInstant(when?.end);
  const given = read.text(page, "Slug").toLowerCase();
  // No date in the address (the owner, Nov 22, 2026): slugFree numbers a
  // repeated title.
  const slug = SLUG.test(given) ? given : slugify(title) || "event";
  const host = read.select(page, "Host") ?? read.text(page, "Host");
  const debrief = read.url(page, "Debrief");
  return {
    capacity: wholeNumber(read.number(page, "Capacity")),
    classes:
      (read.select(page, "Access") ?? read.select(page, "Way in")) === "Members"
        ? ["member"]
        : null,
    debrief: debrief?.startsWith("https://") ? debrief : null,
    ends_at: endsAt && endsAt > startsAt ? endsAt : null,
    entry: entryOf(page),
    host: host && !THE_SOCIETY.test(host.trim()) ? host.trim() : null,
    off_campus: read.checkbox(page, "Off campus"),
    slug,
    starts_at: startsAt,
    summary: read.text(page, "Summary").slice(0, 500) || null,
    title: title.slice(0, 200),
    venue: read.text(page, "Venue") || null,
  };
};

// ── The one-time import ──────────────────────────────────────────────────────

/** Notion members' addresses, by their Notion id. */
const addressesById = (users: NotionUser[]) =>
  new Map(
    users
      .filter((u) => u.type === "person" && u.person?.email)
      .map((u) => [u.id, (u.person?.email ?? "").toLowerCase()])
  );

const leadOf = async (
  ctx: SyncContext,
  page: NotionPage,
  addresses: Map<string, string>
) => {
  const [person] = read.people(page, "Lead");
  const email = person ? addresses.get(person) : undefined;
  if (!email) {
    return null;
  }
  const { data } = await ctx.admin
    .schema("api")
    .rpc("user_by_email", { email });
  return (data as string | null) ?? null;
};

const partnerNamed = async (ctx: SyncContext, name: string | null) => {
  if (!name) {
    return null;
  }
  const { data } = await ctx.admin
    .schema("api")
    .from("partners")
    .select("id, name_en, name_ar")
    .eq("status", "active");
  const wanted = name.toLowerCase();
  return (
    (data ?? []).find(
      (p) => p.name_en.toLowerCase() === wanted || p.name_ar === name
    )?.id ?? null
  );
};

const slugFree = async (ctx: SyncContext, slug: string) => {
  const { data } = await ctx.admin
    .schema("api")
    .from("events")
    .select("slug")
    .like("slug", `${slug}%`);
  const taken = new Set((data ?? []).map((e) => e.slug));
  let candidate = slug;
  for (let n = 2; taken.has(candidate); n += 1) {
    candidate = `${slug}-${n}`;
  }
  return candidate;
};

const keepDebrief = async (
  ctx: SyncContext,
  eventId: string,
  url: string | null
) => {
  if (!url) {
    return;
  }
  await ctx.admin
    .schema("api")
    .from("debriefs")
    .upsert(
      { event_id: eventId, updated_at: new Date().toISOString(), url },
      { ignoreDuplicates: true, onConflict: "event_id" }
    );
};

/** An event already on the site keeps its content; it gains its lead. */
const completeExisting = async (
  ctx: SyncContext,
  eventId: string,
  page: NotionPage,
  lead: string | null
) => {
  if (lead) {
    await ctx.admin
      .schema("api")
      .from("events")
      .update({ lead_id: lead })
      .eq("id", eventId)
      .is("lead_id", null);
  }
  await keepDebrief(ctx, eventId, rowValues(page)?.debrief ?? null);
  count(ctx, "event.completed");
};

/** A row the site never had becomes a draft in the Diwan. */
const makeDraft = async (
  ctx: SyncContext,
  page: NotionPage,
  v: RowValues,
  lead: string | null
) => {
  const [slug, body, image, partner] = await Promise.all([
    slugFree(ctx, v.slug),
    bodyOf(ctx, page),
    copyImage(ctx, page, "Image", "events"),
    partnerNamed(ctx, v.host),
  ]);
  const { data, error } = await ctx.admin
    .schema("api")
    .from("events")
    .insert({
      body_en: body,
      capacity: v.capacity,
      ends_at: v.ends_at,
      entry: v.entry,
      ...(v.classes ? { classes: v.classes } : {}),
      image_path: image ?? null,
      lead_id: lead,
      off_campus: v.off_campus,
      partner_id: partner,
      slug,
      starts_at: v.starts_at,
      status: "draft",
      summary_en: v.summary,
      // The Arabic row fills these; until then the column holds the title.
      title_ar: v.title,
      title_en: v.title,
      venue_en: v.venue,
    })
    .select("id")
    .single();
  if (error) {
    throw error;
  }
  await saveLink(ctx, "event", page.id, data.id, null);
  await keepDebrief(ctx, data.id, v.debrief);
  count(ctx, "event.imported");
  return data.id;
};

const importEnglish = async (
  ctx: SyncContext,
  page: NotionPage,
  addresses: Map<string, string>
) => {
  const [existing, lead] = await Promise.all([
    recordFor(ctx, "event", page.id),
    leadOf(ctx, page, addresses),
  ]);
  if (existing) {
    await completeExisting(ctx, existing, page, lead);
    return;
  }
  const v = rowValues(page);
  if (!v) {
    problem(
      ctx,
      `Notion event "${read.text(page, "Title") || bareId(page.id)}" has no start time, so it was not brought over. Make it in the Diwan.`
    );
    return;
  }
  await makeDraft(ctx, page, v, lead);
};

/**
 * The English title of an Arabic row that has no English row: another
 * Arabic row with the same title names its English row (the general
 * meetings are one title on many dates).
 */
const twinTitle = (page: NotionPage, rows: NotionPage[]) => {
  const title = read.text(page, "Title");
  const byId = new Map(rows.map((r) => [bareId(r.id), r]));
  for (const other of rows) {
    const [of] = read.relation(other, "Edition of");
    if (other !== page && of && read.text(other, "Title") === title) {
      const english = byId.get(bareId(of));
      if (english) {
        return read.text(english, "Title");
      }
    }
  }
  return null;
};

/** Fills the event's Arabic only where the site has none yet. */
const fillArabic = async (
  ctx: SyncContext,
  eventId: string,
  page: NotionPage
) => {
  const { data: event } = await ctx.admin
    .schema("api")
    .from("events")
    .select("title_en, title_ar, summary_ar, venue_ar, body_ar")
    .eq("id", eventId)
    .single();
  const title = read.text(page, "Title");
  const body = event?.body_ar ? null : await bodyOf(ctx, page);
  const update = {
    ...(title && (!event?.title_ar || event.title_ar === event.title_en)
      ? { title_ar: title.slice(0, 200) }
      : {}),
    ...(event?.summary_ar
      ? {}
      : { summary_ar: read.text(page, "Summary").slice(0, 500) || null }),
    ...(event?.venue_ar ? {} : { venue_ar: read.text(page, "Venue") || null }),
    ...(body ? { body_ar: body } : {}),
  };
  if (Object.keys(update).length > 0) {
    const { error } = await ctx.admin
      .schema("api")
      .from("events")
      .update(update)
      .eq("id", eventId);
    if (error) {
      throw error;
    }
  }
  await saveLink(ctx, "event_ar", page.id, eventId, null);
  count(ctx, "event_ar.imported");
};

const importArabic = async (
  ctx: SyncContext,
  page: NotionPage,
  rows: NotionPage[],
  addresses: Map<string, string>
) => {
  if (await recordFor(ctx, "event_ar", page.id)) {
    return;
  }
  const [of] = read.relation(page, "Edition of");
  let eventId = of ? await recordFor(ctx, "event", bareId(of)) : null;
  if (!eventId) {
    const english = twinTitle(page, rows);
    const v = english ? rowValues(page, english) : null;
    if (!v) {
      problem(
        ctx,
        `Notion's Arabic event "${read.text(page, "Title")}" has no English row, so it was not brought over. Make it in the Diwan.`
      );
      return;
    }
    eventId = await makeDraft(ctx, page, v, await leadOf(ctx, page, addresses));
    // That link was the English one; the row is the Arabic edition.
    await ctx.admin
      .schema("api")
      .from("notion_links")
      .delete()
      .eq("kind", "event")
      .eq("notion_page_id", bareId(page.id));
    await ctx.admin
      .schema("api")
      .from("events")
      .update({ body_en: null, summary_en: null, venue_en: null })
      .eq("id", eventId);
  }
  await fillArabic(ctx, eventId, page);
};

/**
 * Once: everything Notion's Events rows held that the site did not.
 * English rows first, so each Arabic row finds its event.
 */
export const importEvents = async (ctx: SyncContext, users: NotionUser[]) => {
  if ((await importedState(ctx)).events) {
    return;
  }
  const rows = await ctx.notion.query(ctx.sources.events);
  const addresses = addressesById(users);
  const before = ctx.problems.length;
  const english = rows.filter((r) => languageOf(r) === "en");
  const arabic = rows.filter((r) => languageOf(r) === "ar");
  for (const page of english) {
    if (outOfTime(ctx)) {
      return;
    }
    try {
      // biome-ignore lint/performance/noAwaitInLoops: rate-limited, sequential
      await importEnglish(ctx, page, addresses);
    } catch (error) {
      problem(
        ctx,
        `import event ${bareId(page.id)}: ${(error as Error).message}`
      );
    }
  }
  for (const page of arabic) {
    if (outOfTime(ctx)) {
      return;
    }
    try {
      // biome-ignore lint/performance/noAwaitInLoops: rate-limited, sequential
      await importArabic(ctx, page, rows, addresses);
    } catch (error) {
      problem(
        ctx,
        `import event ${bareId(page.id)}: ${(error as Error).message}`
      );
    }
  }
  if (ctx.problems.length === before) {
    await markImported(ctx, "events");
  }
};

// ── The read-only copy ───────────────────────────────────────────────────────

interface SiteEvent {
  classes: string[];
  ends_at: string | null;
  entry: string;
  id: string;
  lead_id: string | null;
  slug: string;
  starts_at: string;
  status: string;
  title_ar: string;
  title_en: string;
  venue_ar: string | null;
  venue_en: string | null;
}

/** Each lead's Notion id, by their site account (matched by address). */
const leadsInNotion = async (
  ctx: SyncContext,
  events: SiteEvent[],
  users: NotionUser[]
) => {
  const people = peopleByEmail(users);
  const ids = [...new Set(events.map((e) => e.lead_id).filter(Boolean))];
  const found = await Promise.all(
    ids.map(async (id) => {
      const { data } = await ctx.admin.auth.admin.getUserById(id as string);
      const email = data.user?.email?.toLowerCase();
      return [id, email ? people.get(email) : undefined] as const;
    })
  );
  return new Map(found.filter(([, notion]) => notion) as [string, string][]);
};

/** One language's copy of an event, as Notion row properties. */
export const copyProps = (
  ctx: Pick<SyncContext, "appUrl" | "webUrl">,
  event: SiteEvent,
  lang: "ar" | "en",
  lead: string | undefined
): Record<string, object> => {
  const arabic = lang === "ar";
  const live = event.status === "published";
  return {
    Access: prop.select(accessLabel(event)),
    Diwan: prop.url(`${ctx.appUrl}/events/${event.slug}`),
    "Diwan ID": prop.text(event.id),
    Language: prop.select(arabic ? "Arabic" : "English"),
    Lead: prop.people(lead ? [lead] : []),
    "Public page": prop.url(
      live ? `${ctx.webUrl}${arabic ? "/ar" : ""}/events/${event.slug}` : null
    ),
    Slug: prop.text(event.slug),
    Status: prop.select(STATUS[event.status] ?? "Planning"),
    Title: prop.title(arabic ? event.title_ar : event.title_en),
    Venue: prop.text(arabic ? event.venue_ar : event.venue_en),
    When: prop.date(event.starts_at, event.ends_at),
  };
};

/**
 * Every event on the site, copied to Notion's Events database: an
 * English row and its Arabic edition. Written only when it changed,
 * removed when the event is gone. Waits for the import.
 */
export const copyEvents = async (ctx: SyncContext, users: NotionUser[]) => {
  if (!(await importedState(ctx)).events) {
    return;
  }
  const { data, error } = await ctx.admin
    .schema("api")
    .from("events")
    .select(
      "id, slug, title_en, title_ar, venue_en, venue_ar, starts_at, ends_at, status, entry, classes, lead_id"
    )
    .order("starts_at");
  if (error) {
    throw error;
  }
  const events = (data ?? []) as SiteEvent[];
  const leads = await leadsInNotion(ctx, events, users);
  const english: Row[] = events.map((e) => ({
    key: e.id,
    props: copyProps(ctx, e, "en", leads.get(e.lead_id ?? "")),
  }));
  await mirror(ctx, "event", ctx.sources.events, english, { synced: false });
  const rows = await linksOf(ctx, "event");
  const arabic: Row[] = events
    .filter((e) => rows.has(e.id))
    .map((e) => ({
      key: e.id,
      props: {
        ...copyProps(ctx, e, "ar", leads.get(e.lead_id ?? "")),
        "Edition of": prop.relation([rows.get(e.id)?.notion_page_id ?? ""]),
      },
    }));
  await mirror(ctx, "event_ar", ctx.sources.events, arabic, { synced: false });
};

const richText = (content: string) => [{ text: { content }, type: "text" }];

const COPY_NOTE =
  "A read-only copy the site writes: make and edit events in the Diwan (auibsal.org/diwan/events). Anything typed here is replaced at the next sync. Link a plan or a project to a row; never edit the row itself.";

/**
 * Once the import is done: the database says it is a copy, and the
 * columns the site no longer writes (Summary, Capacity, Off campus, Host,
 * Debrief, Image, RSVPs, Platform note) are removed, so nothing there
 * looks editable. Their values are on the site.
 */
/**
 * Makes a Notion database a read-only copy: its own properties go, then
 * the database takes its title, the note on what it is, and the lock that
 * keeps its properties and views as the site set them (decisions.md, Where
 * things live). The description and lock are the database's; the
 * properties are its data source's.
 */
export const lockCopy = async (
  ctx: SyncContext,
  dataSourceId: string,
  copy: { note: string; remove: string[]; title: string }
) => {
  await ctx.notion.updateDataSource(dataSourceId, {
    properties: Object.fromEntries(copy.remove.map((name) => [name, null])),
    title: richText(copy.title),
  });
  const { parent } = await ctx.notion.dataSource(dataSourceId);
  if (parent?.database_id) {
    await ctx.notion.updateDatabase(parent.database_id, {
      description: richText(copy.note),
      is_locked: true,
      title: richText(copy.title),
    });
  }
};

export const lockEvents = async (ctx: SyncContext) => {
  const state = await importedState(ctx);
  if (!state.events || state.eventsLocked) {
    return;
  }
  await lockCopy(ctx, ctx.sources.events, {
    note: COPY_NOTE,
    remove: [
      "Summary",
      "Capacity",
      "Off campus",
      "Host",
      "Debrief",
      "Image",
      "RSVPs",
      "Platform note",
    ],
    title: "Events (from the site, read-only)",
  });
  await markImported(ctx, "eventsLocked");
  count(ctx, "event.locked");
};
