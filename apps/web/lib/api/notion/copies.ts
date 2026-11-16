import "server-only";

import {
  type LinkKind,
  linksOf,
  problem,
  type SyncContext,
  saveLink,
} from "./context";
import { mirror, type Row } from "./mirrors";
import { prop } from "./props";

/**
 * The read-only copies added on Nov 16, 2026 (decisions.md, Where things
 * live), under "From the site (read-only)" beside Events and Needs:
 * Editions, Productions (the Company's productions and Next Stop's
 * episodes), Openings, Organizations, Announcements and resolutions, and
 * the five Measures. Each has one row per record, written only by the
 * site with a link back to the Diwan, updated by the sync every 15
 * minutes, ticked Archived (never deleted) when the record goes, and never
 * read back. Nothing about a person is copied: each copy reads only the
 * columns in COPY_COLUMNS, which a test keeps free of personal fields.
 */

/** Every site column each copy reads, and nothing else. */
export const COPY_COLUMNS = {
  announcements: "id, title_en, sent_at, shown_at, created_at, link_path",
  calls: "issue_id, opens_at, closes_at",
  episodes:
    "id, slug, season, number, segment, title_en, released_on, published_at",
  eventDates: "id, starts_at",
  eventOrganizations: "event_id, partner_id",
  eventPartners: "id, partner_id",
  issues:
    "id, number, slug, title_en, title_ar, season_en, status, publish_at, published_at, launch_event_id",
  openings: "id, title_en, owner, kind, is_open, created_at, closes_at",
  partners: "id, slug, name_en, name_ar, kind, is_listed, status",
  productionEvents: "production_id, event_id",
  productions: "id, slug, kind, stage, title_en, is_public",
  resolutions: "id, code, title_en, adopted_on, minutes_id, subject",
} as const;

const day = (value: string | null | undefined) =>
  value ? value.slice(0, 10) : null;

const STATUS_WORD = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");

/** The English row of each event in Notion's Events copy, by event id. */
const eventPages = async (ctx: SyncContext) => {
  const links = await linksOf(ctx, "event");
  return (ids: readonly (string | null | undefined)[]) =>
    [...new Set(ids)]
      .map((id) => (id ? links.get(id)?.notion_page_id : undefined))
      .filter((page): page is string => Boolean(page));
};

const copy = (
  ctx: SyncContext,
  kind: LinkKind,
  source: string | undefined,
  rows: Row[]
) =>
  source
    ? mirror(ctx, kind, source, rows, { archive: true, synced: false })
    : Promise.resolve();

/** "Fall 2026" or "Spring 2027", from a date: the season a production ran. */
export const seasonOf = (iso: string) => {
  const month = Number(iso.slice(5, 7));
  const year = iso.slice(0, 4);
  return month >= 8 ? `Fall ${year}` : `Spring ${year}`;
};

// ── Editions ────────────────────────────────────────────────────────────────

export const copyEditions = async (ctx: SyncContext) => {
  if (!ctx.sources.editions) {
    return;
  }
  const [{ data: issues, error }, { data: calls }] = await Promise.all([
    ctx.admin.schema("api").from("issues").select(COPY_COLUMNS.issues),
    ctx.admin.schema("api").from("calls").select(COPY_COLUMNS.calls),
  ]);
  if (error) {
    throw error;
  }
  const pages = await eventPages(ctx);
  const rows: Row[] = (issues ?? []).map((i) => {
    const call = (calls ?? []).find((c) => c.issue_id === i.id);
    const live = i.status === "published";
    return {
      key: i.id,
      props: {
        Archived: prop.checkbox(false),
        "Call closes": prop.date(day(call?.closes_at)),
        "Call opens": prop.date(day(call?.opens_at)),
        Diwan: prop.url(`${ctx.appUrl}/qirtas/editions/${i.slug}`),
        "Diwan ID": prop.text(i.id),
        Events: prop.relation(pages([i.launch_event_id])),
        Number: prop.number(i.number),
        "Public page": prop.url(
          live ? `${ctx.webUrl}/qirtas/editions/${i.slug}` : null
        ),
        "Publication date": prop.date(day(i.published_at ?? i.publish_at)),
        Season: prop.text(i.season_en),
        Status: prop.select(STATUS_WORD(i.status)),
        Title: prop.title(i.title_en ?? `Edition ${i.number ?? ""}`.trim()),
        "Title (Arabic)": prop.text(i.title_ar),
      },
    };
  });
  await copy(ctx, "edition", ctx.sources.editions, rows);
};

// ── Productions and episodes ────────────────────────────────────────────────

const PRODUCTION_KIND: Record<string, string> = {
  production: "Production",
  staged_reading: "Reading",
};

export const copyProductions = async (ctx: SyncContext) => {
  if (!ctx.sources.productions) {
    return;
  }
  const [
    { data: productions, error },
    { data: dates },
    { data: episodes, error: episodesError },
    { data: eventDates },
  ] = await Promise.all([
    ctx.admin
      .schema("api")
      .from("productions")
      .select(COPY_COLUMNS.productions),
    ctx.admin
      .schema("api")
      .from("production_events")
      .select(COPY_COLUMNS.productionEvents),
    ctx.admin.schema("api").from("episodes").select(COPY_COLUMNS.episodes),
    ctx.admin.schema("api").from("events").select(COPY_COLUMNS.eventDates),
  ]);
  if (error || episodesError) {
    throw error ?? episodesError;
  }
  const pages = await eventPages(ctx);
  const onStage = (id: string) =>
    (dates ?? [])
      .filter((d) => d.production_id === id)
      .map((d) => (eventDates ?? []).find((e) => e.id === d.event_id))
      .filter((e): e is { id: string; starts_at: string } => Boolean(e))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const shows: Row[] = (productions ?? []).map((p) => {
    const nights = onStage(p.id);
    const first = nights[0]?.starts_at ?? null;
    const last = nights.at(-1)?.starts_at ?? null;
    const shown = p.is_public && !["proposal", "canceled"].includes(p.stage);
    return {
      key: p.id,
      props: {
        Archived: prop.checkbox(false),
        Code: prop.text(first ? seasonOf(first) : null),
        Diwan: prop.url(`${ctx.appUrl}/company/${p.slug}`),
        "Diwan ID": prop.text(p.id),
        Events: prop.relation(pages(nights.map((n) => n.id))),
        "Key dates": prop.date(
          day(first),
          last && last !== first ? day(last) : null
        ),
        Kind: prop.select(PRODUCTION_KIND[p.kind] ?? "Production"),
        "Public page": prop.url(shown ? `${ctx.webUrl}/company` : null),
        Status: prop.select(STATUS_WORD(p.stage)),
        Title: prop.title(p.title_en),
      },
    };
  });
  const now = Date.now();
  const episodeRows: Row[] = (episodes ?? []).map((e) => {
    const live =
      e.published_at !== null && new Date(e.published_at).getTime() <= now;
    return {
      key: e.id,
      props: {
        Archived: prop.checkbox(false),
        Code: prop.text(`S${e.season}E${e.number}`),
        Diwan: prop.url(`${ctx.appUrl}/media/episodes/${e.slug}`),
        "Diwan ID": prop.text(e.id),
        Events: prop.relation([]),
        "Key dates": prop.date(day(e.released_on ?? e.published_at)),
        Kind: prop.select(
          e.segment?.toLowerCase().startsWith("special") ? "Special" : "Episode"
        ),
        "Public page": prop.url(
          live ? `${ctx.webUrl}/next-stop/episodes/${e.slug}` : null
        ),
        Status: prop.select(live ? "Published" : "Draft"),
        Title: prop.title(e.title_en),
      },
    };
  });
  await copy(ctx, "production", ctx.sources.productions, shows);
  await copy(ctx, "episode", ctx.sources.productions, episodeRows);
};

// ── Openings ────────────────────────────────────────────────────────────────

/** The seat that owns each kind of opening (decisions.md, Get involved). */
const OPENING_SEAT: Record<string, string> = {
  council: "The Council",
  media: "Director of Media",
  membership: "Director of Membership",
  partnerships: "Director of Partnerships",
  program: "Director of Events",
  qirtas: "Editor-in-Chief",
};

export const copyOpenings = async (ctx: SyncContext) => {
  if (!ctx.sources.openings) {
    return;
  }
  const { data, error } = await ctx.admin
    .schema("api")
    .from("openings")
    .select(COPY_COLUMNS.openings);
  if (error) {
    throw error;
  }
  const now = Date.now();
  const rows: Row[] = (data ?? []).map((o) => {
    const open =
      o.is_open &&
      (o.closes_at === null || new Date(o.closes_at).getTime() > now);
    return {
      key: o.id,
      props: {
        Archived: prop.checkbox(false),
        Closes: prop.date(day(o.closes_at)),
        Diwan: prop.url(`${ctx.appUrl}/membership/openings/${o.id}`),
        "Diwan ID": prop.text(o.id),
        Opens: prop.date(day(o.created_at)),
        Role: prop.title(o.title_en),
        Seat: prop.text(OPENING_SEAT[o.owner] ?? null),
        Status: prop.select(open ? "Open" : "Closed"),
      },
    };
  });
  await copy(ctx, "opening", ctx.sources.openings, rows);
};

// ── Organizations ───────────────────────────────────────────────────────────

export const copyOrganizations = async (ctx: SyncContext) => {
  if (!ctx.sources.organizations) {
    return;
  }
  const [{ data, error }, { data: withEvents }, { data: hosted }] =
    await Promise.all([
      ctx.admin.schema("api").from("partners").select(COPY_COLUMNS.partners),
      ctx.admin
        .schema("api")
        .from("event_organizations")
        .select(COPY_COLUMNS.eventOrganizations),
      ctx.admin
        .schema("api")
        .from("events")
        .select(COPY_COLUMNS.eventPartners)
        .not("partner_id", "is", null),
    ]);
  if (error) {
    throw error;
  }
  const pages = await eventPages(ctx);
  const rows: Row[] = (data ?? []).map((p) => {
    const events = [
      ...(withEvents ?? [])
        .filter((o) => o.partner_id === p.id)
        .map((o) => o.event_id),
      ...(hosted ?? []).filter((e) => e.partner_id === p.id).map((e) => e.id),
    ];
    const listed = p.is_listed && p.status === "active";
    return {
      key: p.id,
      props: {
        Archived: prop.checkbox(p.status === "ended"),
        Diwan: prop.url(`${ctx.appUrl}/partnerships/${p.slug}`),
        "Diwan ID": prop.text(p.id),
        Events: prop.relation(pages(events)),
        Kind: prop.select(STATUS_WORD(p.kind)),
        Listed: prop.checkbox(listed),
        Name: prop.title(p.name_en),
        "Name (Arabic)": prop.text(p.name_ar),
        "Public link": prop.url(listed ? `${ctx.webUrl}/partners` : null),
      },
    };
  });
  await copy(ctx, "organization", ctx.sources.organizations, rows);
};

// ── Announcements and resolutions ───────────────────────────────────────────

export const copyRecords = async (ctx: SyncContext) => {
  if (!ctx.sources.records) {
    return;
  }
  const [
    { data: announcements, error },
    { data: resolutions, error: resolutionsError },
    { data: aboutPeople },
  ] = await Promise.all([
    ctx.admin
      .schema("api")
      .from("announcements")
      .select(COPY_COLUMNS.announcements),
    ctx.admin
      .schema("api")
      .from("resolutions")
      .select(COPY_COLUMNS.resolutions)
      .eq("status", "adopted"),
    // A resolution that grants a role exception is about a person: never
    // copied.
    ctx.admin
      .schema("api")
      .from("role_assignments")
      .select("exception_resolution_id")
      .not("exception_resolution_id", "is", null),
  ]);
  if (error || resolutionsError) {
    throw error ?? resolutionsError;
  }
  const personal = new Set(
    (aboutPeople ?? []).map((a) => a.exception_resolution_id)
  );
  const notes: Row[] = (announcements ?? []).map((a) => ({
    key: a.id,
    props: {
      Archived: prop.checkbox(false),
      Date: prop.date(day(a.sent_at ?? a.shown_at ?? a.created_at)),
      Diwan: prop.url(`${ctx.appUrl}/council/announcements`),
      "Diwan ID": prop.text(a.id),
      Kind: prop.select("Announcement"),
      "Public link": prop.url(
        a.link_path?.startsWith("/") ? `${ctx.webUrl}${a.link_path}` : null
      ),
      "RES number": prop.text(null),
      Title: prop.title(a.title_en),
    },
  }));
  const adopted: Row[] = (resolutions ?? [])
    .filter((r) => !personal.has(r.id))
    .map((r) => ({
      key: r.id,
      props: {
        Archived: prop.checkbox(false),
        Date: prop.date(r.adopted_on),
        Diwan: prop.url(
          r.minutes_id && r.code
            ? `${ctx.appUrl}/council/meetings/${r.minutes_id}/resolutions/${r.code}`
            : `${ctx.appUrl}/council/meetings`
        ),
        "Diwan ID": prop.text(r.id),
        Kind: prop.select("Resolution"),
        "Public link": prop.url(null),
        "RES number": prop.text(r.code),
        Title: prop.title(r.title_en),
      },
    }));
  await copy(ctx, "announcement", ctx.sources.records, notes);
  await copy(ctx, "resolution", ctx.sources.records, adopted);
};

// ── Measures ────────────────────────────────────────────────────────────────

/**
 * The five measures (the Measures database's rows, by their title), from
 * the site's own records; counts only, never names.
 */
export const MEASURES = {
  "Active members": (m: MeasureCounts) => m.active_members,
  "Events and attendance": (m: MeasureCounts) => m.check_ins,
  Members: (m: MeasureCounts) => m.members,
  "Qirtas pieces published": (m: MeasureCounts) => m.pieces,
  "Staff hours": (m: MeasureCounts) => m.staff_hours,
} as const;

export interface MeasureCounts {
  active_members: number;
  check_ins: number;
  events: number;
  members: number;
  pieces: number;
  staff_hours: number;
}

/** The month just ended, as its first day: "2026-11-01" on December 1. */
export const lastMonth = (now: Date) => {
  const baghdad = new Date(now.getTime() + 3 * 3_600_000);
  const year = baghdad.getUTCFullYear();
  const month = baghdad.getUTCMonth();
  const start = new Date(Date.UTC(year, month - 1, 1));
  return {
    first: baghdad.getUTCDate() === 1,
    month: start.toISOString().slice(0, 10),
  };
};

const MONTH_NAME = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });

/**
 * On the first of each month, the month just ended is written into the
 * Measures database: each measure's count, its month and the day it was
 * written, replacing filling them in by hand. Once a month: the link keeps
 * the month written.
 */
export const copyMeasures = async (ctx: SyncContext, now = new Date()) => {
  const source = ctx.sources.measures;
  const { first, month } = lastMonth(now);
  if (!(source && first)) {
    return;
  }
  const done = await linksOf(ctx, "measure");
  if (done.get("month")?.content_hash === month) {
    return;
  }
  const { data, error } = await ctx.admin
    .schema("api")
    .rpc("society_measures", { month_start: month });
  if (error) {
    throw error;
  }
  const counts = data as unknown as MeasureCounts;
  const pages = await ctx.notion.query(source);
  const today = now.toISOString().slice(0, 10);
  for (const [name, count] of Object.entries(MEASURES)) {
    const page = pages.find(
      (p) =>
        (p.properties.Measure?.title ?? [])
          .map((t) => t.plain_text)
          .join("")
          .trim() === name
    );
    if (!page) {
      problem(ctx, `measures: no row named "${name}" in the Measures database`);
      continue;
    }
    const note =
      name === "Events and attendance"
        ? `${MONTH_NAME(month)}: ${counts.events} events, ${counts.check_ins} check-ins. Written by the site.`
        : `${MONTH_NAME(month)}. Written by the site.`;
    // biome-ignore lint/performance/noAwaitInLoops: rate-limited, sequential
    await ctx.notion.updatePage(page.id, {
      Notes: prop.text(note),
      Now: prop.number(count(counts)),
      Source: prop.select("Diwan"),
      Updated: prop.date(today),
    });
  }
  await saveLink(ctx, "measure", source.replaceAll("-", ""), "month", month);
};
