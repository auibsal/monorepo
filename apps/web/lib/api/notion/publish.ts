import "server-only";

import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { sanitizeRichText } from "@repo/sal-data";
import { uploadMedia } from "@repo/storage";
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
import { named, prop, read, slugify } from "./props";
import {
  checkArabicEdition,
  checkEvent,
  checkQirtas,
  eventExtras,
  languageOf,
  type QirtasDesk,
  type QirtasValues,
} from "./rules";

/**
 * Events and Qirtas pieces are written in Notion (Publishing). An event set
 * to "Ready to publish" is checked and published; "Cancel on the site"
 * cancels a published event. One language per row (Nov 4, 2026): the
 * English row publishes the event, and its Arabic edition (Language
 * Arabic, Edition of the English row) gives the event its Arabic title,
 * summary, venue and text. News ("News post" or "Qirtas" pages) goes to
 * Qirtas's newsroom, in Editing. The person who last edited the page must
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

export const needsChangesNote = (problems: string[]) =>
  `Not published (${stamp()}): ${problems.join(" ")}`;

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
 * Notion's linked rows the site still knows (owner, Nov 5, 2026: no event
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
    .update({ status: "cancelled" })
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
  // Off campus (owner, Nov 5, 2026): published only once the General
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
        `Saved in the Diwan as a draft (${stamp()}): an event off campus is published once the General Secretary records Student Life's written approval on its page in the Diwan. Then set Ready to publish again.`
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
 * name; the Society otherwise), and Debrief links its F-13 page, kept for
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
    // (owner, Nov 7, 2026): the edition shows them as they are there.
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

/** The type a Notion piece starts as on each desk (editors change it). */
const STARTING_TYPE = {
  gallery: "art",
  games: "crossword",
  letters: "creative_nonfiction",
  news: "report",
  video: "video_report",
  voices: "column",
} as const satisfies Record<QirtasDesk, string>;

/** The publisher's own byline: their contributor record, made if needed. */
const bylineFor = async (ctx: SyncContext, userId: string) => {
  const j = ctx.admin.schema("journal");
  const { data: found } = await j
    .from("contributors")
    .select("id")
    .eq("user_id", userId)
    .eq("is_pen_name", false)
    .limit(1)
    .maybeSingle();
  if (found) {
    return found.id;
  }
  const { data: profile } = await ctx.admin
    .schema("core")
    .from("profiles")
    .select("full_name_en, full_name_ar")
    .eq("id", userId)
    .maybeSingle();
  const name = profile?.full_name_en?.trim() || "Qirtas";
  const base = slugify(name) || "contributor";
  const { data: taken } = await j
    .from("contributors")
    .select("slug")
    .like("slug", `${base}%`);
  const used = new Set((taken ?? []).map((c) => c.slug));
  let slug = base;
  for (let n = 2; used.has(slug); n += 1) {
    slug = `${base}-${n}`;
  }
  const { data, error } = await j
    .from("contributors")
    .insert({
      name_ar: profile?.full_name_ar ?? null,
      name_en: name,
      slug,
      user_id: userId,
    })
    .select("id")
    .single();
  if (error) {
    throw error;
  }
  return data.id;
};

const pieceSlug = async (ctx: SyncContext, title: string) => {
  const base = (slugify(title) || "piece").slice(0, 70);
  const { data: taken } = await ctx.admin
    .schema("journal")
    .from("pieces")
    .select("slug")
    .like("slug", `${base}%`);
  const used = new Set((taken ?? []).map((p) => p.slug));
  let slug = base;
  for (let n = 2; used.has(slug); n += 1) {
    slug = `${base}-${n}`;
  }
  return slug;
};

/** Who may send a row to a desk: the desk's editor or the Editor-in-Chief. */
const deskPublisher = async (
  ctx: SyncContext,
  email: string,
  desk: QirtasDesk
) => {
  const rpc = (permission: string) =>
    ctx.admin.schema("access").rpc("notion_publisher", {
      email,
      permission,
      scope_type: "global",
    });
  const [editor, chief] = await Promise.all([
    rpc(`journal.edit.${desk}`),
    rpc("journal.approve"),
  ]);
  return (editor.data ?? chief.data) as string | null;
};

const STILL_EDITING = ["editing", "author_approved"];

const PAST_EDITING =
  "This piece is past editing in the Diwan. Change it there (or reopen it there first).";

const editingNote = () =>
  `In the Qirtas newsroom since ${stamp()}, in Editing: the approvals and publishing happen in the Diwan.`;

/**
 * An Arabic edition of a Qirtas row: its title, excerpt and page text
 * become the Arabic of the English row's piece, which must be imported
 * first and still be in editing.
 */
const importQirtasEdition = async (
  ctx: SyncContext,
  page: NotionPage,
  email: string,
  v: QirtasValues & { of: string }
) => {
  const j = ctx.admin.schema("journal");
  const pieceId = await recordFor(ctx, "piece", v.of);
  const { data: piece } = pieceId
    ? await j
        .from("pieces")
        .select("desk, status")
        .eq("id", pieceId)
        .maybeSingle()
    : { data: null };
  if (!(pieceId && piece?.desk)) {
    await needsChanges(ctx, page, [
      "Send the English row (Edition of) first; this edition then adds its Arabic.",
    ]);
    return;
  }
  if (!(await deskPublisher(ctx, email, piece.desk as QirtasDesk))) {
    await needsChanges(ctx, page, [
      `${email} does not edit the ${piece.desk} desk in the Diwan. Ask its editor or the Editor-in-Chief to set Ready to publish.`,
    ]);
    return;
  }
  if (!STILL_EDITING.includes(piece.status)) {
    await needsChanges(ctx, page, [PAST_EDITING]);
    return;
  }
  const body = await bodyOf(ctx, page);
  const { error } = await j
    .from("pieces")
    .update({
      language: "bilingual",
      title_ar: v.title,
      ...(v.deck ? { deck_ar: v.deck } : {}),
    })
    .eq("id", pieceId);
  if (error) {
    throw error;
  }
  if (body) {
    await j
      .from("piece_bodies")
      .update({ body_ar: body })
      .eq("piece_id", pieceId);
  }
  await saveLink(ctx, "piece_ar", page.id, pieceId, null);
  await ctx.notion.updatePage(page.id, {
    Diwan: prop.url(`${ctx.appUrl}/qirtas/pieces/${pieceId}`),
    "Diwan ID": prop.text(pieceId),
    "Platform note": prop.text(editingNote()),
    Status: prop.select("In editing"),
  });
  count(ctx, "qirtas.edition");
};

/**
 * Staff writing for Qirtas (Kind "Qirtas", or "News post" for the News
 * desk), one language per row: imported as a piece in Editing, where it
 * goes through the same approvals as everything else. The person who set
 * Ready to publish needs the desk's permission (or journal.approve) and
 * becomes the byline. A page already imported updates its piece while it
 * is still in editing. An Arabic edition adds its Arabic to the English
 * row's piece.
 */
const importQirtas = async (
  ctx: SyncContext,
  page: NotionPage,
  email: string,
  fallbackDesk?: QirtasDesk
) => {
  const checked = checkQirtas(page, fallbackDesk);
  if (!checked.ok) {
    await needsChanges(ctx, page, checked.problems);
    return;
  }
  const v = checked.values;
  if (v.of) {
    await importQirtasEdition(ctx, page, email, { ...v, of: v.of });
    return;
  }
  const desk = v.desk as QirtasDesk;
  const publisher = await deskPublisher(ctx, email, desk);
  if (!publisher) {
    await needsChanges(ctx, page, [
      `${email} does not edit the ${desk} desk in the Diwan. Ask its editor or the Editor-in-Chief to set Ready to publish.`,
    ]);
    return;
  }
  const body = await bodyOf(ctx, page);
  const ar = v.language === "ar";
  const text = ar
    ? { deck_ar: v.deck, title_ar: v.title }
    : { deck_en: v.deck, title_en: v.title };
  let bodies: { body_ar?: string; body_en?: string } = {};
  if (body) {
    bodies = ar ? { body_ar: body } : { body_en: body };
  }
  const j = ctx.admin.schema("journal");
  const existing = await recordFor(ctx, "piece", page.id);
  let id = existing;
  if (id) {
    const { data: piece } = await j
      .from("pieces")
      .select("status")
      .eq("id", id)
      .maybeSingle();
    if (piece && !STILL_EDITING.includes(piece.status)) {
      await needsChanges(ctx, page, [PAST_EDITING]);
      return;
    }
    const { error } = await j
      .from("pieces")
      .update({ ...text, publish_at: v.publish_at })
      .eq("id", id);
    if (error) {
      throw error;
    }
    if (body) {
      await j.from("piece_bodies").update(bodies).eq("piece_id", id);
    }
  } else {
    const { data, error } = await j
      .from("pieces")
      .insert({
        ...text,
        category: STARTING_TYPE[desk],
        contributor_id: await bylineFor(ctx, publisher),
        language: v.language,
        publish_at: v.publish_at,
        slug: await pieceSlug(ctx, v.title),
        status: "editing",
      })
      .select("id")
      .single();
    if (error) {
      throw error;
    }
    ({ id } = data);
    await j.from("piece_bodies").insert({ piece_id: id, ...bodies });
  }
  await saveLink(ctx, "piece", page.id, id, null);
  await ctx.notion.updatePage(page.id, {
    Diwan: prop.url(`${ctx.appUrl}/qirtas/pieces/${id}`),
    "Diwan ID": prop.text(id),
    "Platform note": prop.text(editingNote()),
    Status: prop.select("In editing"),
  });
  count(ctx, existing ? "qirtas.updated" : "qirtas.imported");
};

const statusFilter = (statuses: string[]) => ({
  or: statuses.map((s) => ({ property: "Status", select: { equals: s } })),
});

/** Pages waiting for the platform, handled one at a time. */
export const publishWaiting = async (ctx: SyncContext) => {
  const [events, news, qirtas] = await Promise.all([
    ctx.notion.query(ctx.sources.events, statusFilter([READY, CANCEL])),
    ctx.notion.query(ctx.sources.news, {
      and: [
        { property: "Kind", select: { equals: "News post" } },
        statusFilter([READY]),
      ],
    }),
    ctx.notion.query(ctx.sources.news, {
      and: [
        // Notion refuses a filter on an option the property no longer
        // has, so the old name "Waraq" is not asked for.
        { property: "Kind", select: { equals: "Qirtas" } },
        statusFilter([READY]),
      ],
    }),
  ]);
  // English rows before their Arabic editions, so an edition finds its
  // event published in the same run.
  const byLanguage = [...events].sort(
    (a, b) => Number(languageOf(a) === "ar") - Number(languageOf(b) === "ar")
  );
  const queue: [Kind | "news" | "waraq", NotionPage][] = [
    ...byLanguage.map((p): [Kind, NotionPage] => ["event", p]),
    ...news.map((p): ["news", NotionPage] => ["news", p]),
    ...qirtas.map((p): ["waraq", NotionPage] => ["waraq", p]),
  ];
  for (const [kind, page] of queue) {
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
      if (kind === "waraq") {
        await importQirtas(ctx, page, email);
      } else if (kind === "news") {
        // The old news posts are Qirtas's News desk now.
        await importQirtas(ctx, page, email, "news");
      } else if (languageOf(page) === "ar") {
        await publishArabicEvent(ctx, page, email);
      } else if (read.select(page, "Status") === CANCEL) {
        await cancelEvent(ctx, page, email);
      } else {
        await publishEvent(ctx, page, email);
      }
    } catch (error) {
      problem(ctx, `${kind} ${bareId(page.id)}: ${(error as Error).message}`);
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
