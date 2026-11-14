import "server-only";

import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { sanitizeRichText } from "@/lib/data";
import { uploadMedia } from "@/lib/storage";
import { pageHtml } from "./blocks";
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
import { named, prop, read } from "./props";
import {
  checkArabicEdition,
  checkEvent,
  eventExtras,
  languageOf,
} from "./rules";

/**
 * Events are written in Notion (Publishing). An event set
 * to "Ready to publish" is checked and published; "Cancel on the site"
 * cancels a published event. One language per row (Nov 4, 2026): the
 * English row publishes the event, and its Arabic edition (Language
 * Arabic, Edition of the English row) gives the event its Arabic title,
 * summary, venue and text. Announcements and Qirtas pieces are written on
 * the site, never in Notion. The person who last edited the page must
 * hold the permission in the Diwan, matched by email.
 * Results go back to the page: status, links, and a note saying what was
 * done or what to fix (also left as a comment).
 */

const READY = "Ready to publish";
const CANCEL = "Cancel on the site";

type Kind = "event";

const PERMISSION: Record<Kind, "events.manage"> = {
  event: "events.manage",
};

export const stamp = () => {
  const now = new Date().toISOString();
  return `${formatLongDate(now, "en")}, ${formatClock(now, "en")}`;
};

export const needsChanges = async (
  ctx: SyncContext,
  page: NotionPage,
  problems: string[]
) => {
  const note = `Not published (${stamp()}): ${problems.join(" ")}`;
  await ctx.notion.updatePage(page.id, {
    "Platform note": prop.text(note),
    Status: prop.select("Needs changes"),
  });
  await ctx.notion.comment(page.id, note);
  count(ctx, "publish.refused");
};

/** The email of the person who last edited the page, if Notion shares it. */
export const editorEmail = async (ctx: SyncContext, page: NotionPage) => {
  const id = page.last_edited_by?.id;
  if (!id) {
    return null;
  }
  const user = await ctx.notion.user(id).catch(() => null);
  return user?.type === "person" ? (user.person?.email ?? null) : null;
};

export const NO_EMAIL =
  "The platform could not see who set the status. In Notion, open Settings, Connections, SAL Platform, and allow it to read user information including email addresses.";

const publisherFor = async (
  ctx: SyncContext,
  kind: Kind,
  email: string,
  programmeId: string | null
) => {
  const { data } = await ctx.admin.schema("access").rpc("notion_publisher", {
    email,
    permission: PERMISSION[kind],
    scope_id: programmeId ?? undefined,
    scope_type: programmeId ? "programme" : "global",
  });
  return (data as string | null) ?? null;
};

export const publisherName = async (ctx: SyncContext, userId: string) => {
  const { data } = await ctx.admin
    .schema("core")
    .from("profiles")
    .select("full_name_en")
    .eq("id", userId)
    .maybeSingle();
  return data?.full_name_en?.trim() || "an officer";
};

/** The page's first image, copied to the public media bucket. */
const copyImage = async (
  ctx: SyncContext,
  page: NotionPage,
  property: string,
  area: string
) => {
  const [file] = read.files(page, property);
  if (!file) {
    return;
  }
  const response = await fetch(file.url, {
    signal: AbortSignal.timeout(20_000),
  });
  const type = response.headers.get("content-type") ?? "";
  if (!(response.ok && type.startsWith("image/"))) {
    problem(ctx, `Could not copy the image on ${page.id}.`);
    return;
  }
  const bytes = await response.arrayBuffer();
  const stored = await uploadMedia(
    ctx.admin,
    area,
    new File([bytes], file.name || "image", { type })
  );
  return stored.path;
};

/**
 * Notion's linked rows the site still knows (decisions.md: no event
 * series): only active rows, the Company's and the Tour's, so an event
 * linked to a former series in Notion is published as an event of its own.
 */

const slugTaken = async (
  ctx: SyncContext,
  slug: string,
  ownId: string | null
) => {
  const query = ctx.admin
    .schema("events")
    .from("events")
    .select("id")
    .eq("slug", slug);
  const { data } = await (ownId ? query.neq("id", ownId) : query).limit(1);
  return (data ?? []).length > 0;
};

/** A one-language page's text as sanitized HTML, or null when it is empty. */
export const bodyOf = async (ctx: SyncContext, page: NotionPage) => {
  const html = pageHtml(await ctx.notion.blocksWithTables(page.id));
  return html ? sanitizeRichText(html) : null;
};

export const publishedNote = (who: string) => `Published ${stamp()} by ${who}.`;

const cancelEvent = async (
  ctx: SyncContext,
  page: NotionPage,
  email: string
) => {
  const id = await recordFor(ctx, "event", page.id);
  if (!id) {
    await needsChanges(ctx, page, [
      "This event was never published, so there is nothing to cancel. Set Status to Canceled.",
    ]);
    return;
  }
  const publisher = await publisherFor(ctx, "event", email, null);
  if (!publisher) {
    await needsChanges(ctx, page, [
      `${email} does not hold events.manage in the Diwan, so the event stays as it is.`,
    ]);
    return;
  }
  const { error } = await ctx.admin
    .schema("events")
    .from("events")
    .update({ status: "canceled" })
    .eq("id", id);
  if (error) {
    throw error;
  }
  await ctx.notion.updatePage(page.id, {
    "Platform note": prop.text(
      `Canceled on the site ${stamp()} by ${await publisherName(ctx, publisher)}. Members who booked are not told automatically: post an announcement in the Diwan (Administration, Content).`
    ),
    Status: prop.select("Canceled"),
  });
  count(ctx, "event.canceled");
};

/** Whether the event is off campus, and when Student Life approved it. */
const offCampusOf = async (ctx: SyncContext, id: string) => {
  const { data, error } = await ctx.admin
    .schema("events")
    .from("events")
    .select("off_campus, student_life_approved_on")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data;
};

const publishEvent = async (
  ctx: SyncContext,
  page: NotionPage,
  email: string
) => {
  const checked = checkEvent(page);
  if (!checked.ok) {
    await needsChanges(ctx, page, checked.problems);
    return;
  }
  const v = checked.values;
  const publisher = await publisherFor(ctx, "event", email, null);
  if (!publisher) {
    await needsChanges(ctx, page, [
      `${email} does not hold events.manage in the Diwan. Ask someone who does to set Ready to publish.`,
    ]);
    return;
  }
  const existing = await recordFor(ctx, "event", page.id);
  if (await slugTaken(ctx, v.slug, existing)) {
    await needsChanges(ctx, page, [
      `Another event already uses the Slug ${v.slug}. Set a different Slug.`,
    ]);
    return;
  }
  // One language per row: the English text is the page itself; the Arabic
  // comes from its Arabic edition, so nothing here blanks it.
  const bodyEn = await bodyOf(ctx, page);
  if (!bodyEn) {
    await needsChanges(ctx, page, [NO_TEXT]);
    return;
  }
  const image = await copyImage(ctx, page, "Image", "events");
  // Off campus (decisions.md): published only once the General
  // Secretary records Student Life's approval on the event's page in the
  // Diwan; until then it is kept there as a draft. Only the General
  // Secretary brings an event back on campus, so Notion never unsets it.
  const before = existing ? await offCampusOf(ctx, existing) : null;
  const offCampus = v.off_campus || Boolean(before?.off_campus);
  const waiting = offCampus && !before?.student_life_approved_on;
  const row = {
    ...v,
    body_en: bodyEn,
    ...(image ? { image_path: image } : {}),
    off_campus: offCampus,
    status: waiting ? "draft" : "published",
  };
  let id = existing;
  if (id) {
    const { error } = await ctx.admin
      .schema("events")
      .from("events")
      .update(row)
      .eq("id", id);
    if (error) {
      throw error;
    }
  } else {
    const { data, error } = await ctx.admin
      .schema("events")
      .from("events")
      .insert({
        ...row,
        created_by: publisher,
        published_at: new Date().toISOString(),
        // Until its Arabic edition is published, the event carries its
        // English title in the Arabic column (the column is required).
        title_ar: v.title_en,
      })
      .select("id")
      .single();
    if (error) {
      throw error;
    }
    ({ id } = data);
  }
  await saveLink(ctx, "event", page.id, id, null);
  await saveHostAndDebrief(ctx, page, id);
  if (waiting) {
    await ctx.notion.updatePage(page.id, {
      Diwan: prop.url(`${ctx.appUrl}/events/${v.slug}`),
      "Diwan ID": prop.text(id),
      "Off campus": prop.checkbox(true),
      "Platform note": prop.text(
        `Saved in the Diwan as a draft (${stamp()}): an event off campus is published once the Secretary records Student Life's written approval on its page in the Diwan. Then set Ready to publish again.`
      ),
      Slug: prop.text(v.slug),
      Status: prop.select("Planning"),
    });
    count(ctx, "event.awaiting_approval");
    return;
  }
  await ctx.notion.updatePage(page.id, {
    Diwan: prop.url(`${ctx.appUrl}/events/${v.slug}`),
    "Diwan ID": prop.text(id),
    "Off campus": prop.checkbox(offCampus),
    "Platform note": prop.text(
      publishedNote(await publisherName(ctx, publisher))
    ),
    "Public page": prop.url(`${ctx.webUrl}/events/${v.slug}`),
    Slug: prop.text(v.slug),
    Status: prop.select("Published"),
  });
  // Its Arabic edition shows the same way in and off campus.
  const arabic = await arabicRowOf(ctx, id);
  if (arabic) {
    await ctx.notion.updatePage(arabic, {
      "Off campus": prop.checkbox(offCampus),
      [named(page, "Access", "Way in")]: prop.select(
        WAY_IN_NAMES[v.entry] ?? "RSVP"
      ),
    });
  }
  count(ctx, existing ? "event.republished" : "event.published");
};

/**
 * The event's host and debrief (decisions §13): Host names the partner the
 * event is held for (matched to the register by its English or Arabic
 * name; the Society otherwise), and Debrief links its event-debrief page, kept for
 * the event's staff only.
 */
const saveHostAndDebrief = async (
  ctx: SyncContext,
  page: NotionPage,
  eventId: string
) => {
  const { debrief, host } = eventExtras(page);
  let partnerId: string | null = null;
  if (host) {
    const { data } = await ctx.admin
      .schema("governance")
      .from("partners")
      .select("id, name_en, name_ar")
      .eq("status", "active");
    const wanted = host.toLowerCase();
    partnerId =
      (data ?? []).find(
        (p) => p.name_en.toLowerCase() === wanted || p.name_ar === host
      )?.id ?? null;
  }
  await ctx.admin
    .schema("events")
    .from("events")
    .update({ partner_id: partnerId })
    .eq("id", eventId);
  const debriefs = ctx.admin.schema("events").from("debriefs");
  if (debrief) {
    await debriefs.upsert({
      event_id: eventId,
      updated_at: new Date().toISOString(),
      url: debrief,
    });
  } else {
    await debriefs.delete().eq("event_id", eventId);
  }
};

/** The Way in options in Notion, by the event's entry. */
const WAY_IN_NAMES: Record<string, string> = {
  invite: "Private",
  members: "Members",
  open: "Open",
  rsvp: "RSVP",
};

/** The Arabic edition's row, if one is linked to the event. */
const arabicRowOf = async (ctx: SyncContext, eventId: string) => {
  const { data } = await ctx.admin
    .schema("core")
    .from("notion_links")
    .select("notion_page_id")
    .eq("kind", "event_ar")
    .eq("record_key", eventId)
    .maybeSingle();
  return data?.notion_page_id ?? null;
};

/** The one-language rule, said where a row has no text yet. */
const NO_TEXT =
  "Write the event's text in English in this page. An Arabic edition is its own row: Language Arabic, Edition of this row.";

const EVENT_STATUS: Record<string, string> = {
  cancelled: "Canceled",
  draft: "Planning",
  published: "Published",
};

/**
 * An event's Arabic edition: its own row, linked to the English row in
 * Edition of. It fills the event's Arabic title, summary, venue and text;
 * the English row must be published first. Its Way in and Off campus are
 * left blank and taken from the English row, never read from the edition.
 */
const publishArabicEvent = async (
  ctx: SyncContext,
  page: NotionPage,
  email: string
) => {
  const checked = checkArabicEdition(page);
  if (!checked.ok) {
    await needsChanges(ctx, page, checked.problems);
    return;
  }
  const v = checked.values;
  const eventId = await recordFor(ctx, "event", v.of);
  if (!eventId) {
    await needsChanges(ctx, page, [
      "Publish the English row (Edition of) first; this edition then adds its Arabic.",
    ]);
    return;
  }
  const { data: event } = await ctx.admin
    .schema("events")
    .from("events")
    .select("slug, programme_id, entry, off_campus, status")
    .eq("id", eventId)
    .maybeSingle();
  const publisher = await publisherFor(
    ctx,
    "event",
    email,
    event?.programme_id ?? null
  );
  if (!publisher) {
    await needsChanges(ctx, page, [
      `${email} does not hold events.manage in the Diwan for this event. Ask someone who does to set Ready to publish.`,
    ]);
    return;
  }
  const body = await bodyOf(ctx, page);
  const { error } = await ctx.admin
    .schema("events")
    .from("events")
    .update({
      summary_ar: v.summary,
      title_ar: v.title,
      venue_ar: v.venue,
      ...(body ? { body_ar: body } : {}),
    })
    .eq("id", eventId);
  if (error) {
    throw error;
  }
  await saveLink(ctx, "event_ar", page.id, eventId, null);
  await ctx.notion.updatePage(page.id, {
    // The way in and off campus are the event's, set on the English row
    // (decisions.md): the edition shows them as they are there.
    ...(event
      ? {
          "Off campus": prop.checkbox(event.off_campus),
          [named(page, "Access", "Way in")]: prop.select(
            WAY_IN_NAMES[event.entry] ?? "RSVP"
          ),
        }
      : {}),
    Diwan: prop.url(`${ctx.appUrl}/events/${event?.slug ?? eventId}`),
    "Diwan ID": prop.text(eventId),
    // The edition shows its event's state: an event still a draft (off
    // campus, waiting for Student Life) has no public page yet.
    ...(event?.status === "published"
      ? {
          "Platform note": prop.text(
            publishedNote(await publisherName(ctx, publisher))
          ),
          "Public page": prop.url(`${ctx.webUrl}/ar/events/${event.slug}`),
          Status: prop.select("Published"),
        }
      : {
          "Platform note": prop.text(
            `Saved with its event (${stamp()}), which is not published yet; the Arabic shows once the English row is published.`
          ),
          "Public page": prop.url(null),
          Status: prop.select(
            EVENT_STATUS[event?.status ?? "draft"] ?? "Planning"
          ),
        }),
  });
  count(ctx, "event_ar.published");
};

const statusFilter = (statuses: string[]) => ({
  or: statuses.map((s) => ({ property: "Status", select: { equals: s } })),
});

/** Pages waiting for the platform, handled one at a time. */
export const publishWaiting = async (ctx: SyncContext) => {
  // Announcements and Qirtas pieces are written on the site (decisions.md,
  // Where things live): Notion publishes events only (and documents).
  const events = await ctx.notion.query(
    ctx.sources.events,
    statusFilter([READY, CANCEL])
  );
  // English rows before their Arabic editions, so an edition finds its
  // event published in the same run.
  const queue = [...events].sort(
    (a, b) => Number(languageOf(a) === "ar") - Number(languageOf(b) === "ar")
  );
  for (const page of queue) {
    if (outOfTime(ctx)) {
      return;
    }
    try {
      // biome-ignore lint/performance/noAwaitInLoops: rate-limited, sequential
      const email = await editorEmail(ctx, page);
      if (!email) {
        await needsChanges(ctx, page, [NO_EMAIL]);
        continue;
      }
      if (languageOf(page) === "ar") {
        await publishArabicEvent(ctx, page, email);
      } else if (read.select(page, "Status") === CANCEL) {
        await cancelEvent(ctx, page, email);
      } else {
        await publishEvent(ctx, page, email);
      }
    } catch (error) {
      problem(ctx, `event ${bareId(page.id)}: ${(error as Error).message}`);
    }
  }
};

/** Confirmed RSVPs per event, written back when the number changed. */
export const syncRsvpCounts = async (ctx: SyncContext) => {
  const links = await linksOf(ctx, "event");
  if (links.size === 0) {
    return;
  }
  const { data } = await ctx.admin
    .schema("events")
    .from("rsvps")
    .select("event_id")
    .eq("status", "confirmed")
    .in("event_id", [...links.keys()]);
  const tally = new Map<string, number>();
  for (const r of data ?? []) {
    tally.set(r.event_id, (tally.get(r.event_id) ?? 0) + 1);
  }
  for (const [eventId, link] of links) {
    if (outOfTime(ctx)) {
      return;
    }
    const total = tally.get(eventId) ?? 0;
    const marker = `rsvps:${total}`;
    if (link.content_hash === marker) {
      continue;
    }
    try {
      // biome-ignore lint/performance/noAwaitInLoops: rate-limited, sequential
      await ctx.notion.updatePage(link.notion_page_id, {
        RSVPs: prop.number(total),
      });
      await saveLink(ctx, "event", link.notion_page_id, eventId, marker);
      count(ctx, "event.rsvps");
    } catch (error) {
      problem(ctx, `rsvps ${eventId}: ${(error as Error).message}`);
    }
  }
};

/** Notion's times are to the minute; a write-back lands just after saving. */
const GRACE_MS = 2 * 60_000;

/**
 * Published events whose Notion row a person edited after the site's last
 * copy, and Published rows the site has no copy of (PROGRESS.md: the site's
 * copies of some events were older than Notion's rows). Reported in the
 * Connected panel, never changed silently: setting the row to "Ready to
 * publish" again updates the site with the editor's permission checked.
 */
export const reportStaleEvents = async (
  ctx: SyncContext,
  bots: Set<string>
) => {
  const rows = await ctx.notion.query(
    ctx.sources.events,
    statusFilter(["Published"])
  );
  const { data, error } = await ctx.admin
    .schema("core")
    .from("notion_links")
    .select("notion_page_id, synced_at")
    .in("kind", ["event", "event_ar"]);
  if (error) {
    throw error;
  }
  const synced = new Map(
    (data ?? []).map((l) => [l.notion_page_id, Date.parse(l.synced_at)])
  );
  const stale: string[] = [];
  const missing: string[] = [];
  for (const page of rows) {
    const title = read.text(page, "Title") || bareId(page.id);
    const at = synced.get(bareId(page.id));
    if (at === undefined) {
      missing.push(title);
      continue;
    }
    const editor = page.last_edited_by?.id;
    if (
      Date.parse(page.last_edited_time) > at + GRACE_MS &&
      !(editor && bots.has(editor))
    ) {
      stale.push(title);
    }
  }
  count(ctx, "event.stale", stale.length);
  count(ctx, "event.missing", missing.length);
  if (stale.length > 0) {
    problem(
      ctx,
      `Edited in Notion after publishing (set to Ready to publish to update the site): ${stale.join("; ")}`
    );
  }
  if (missing.length > 0) {
    problem(
      ctx,
      `Marked Published in Notion but not on the site (set to Ready to publish): ${missing.join("; ")}`
    );
  }
};
