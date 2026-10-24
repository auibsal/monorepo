import "server-only";

import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { sanitizeRichText } from "@repo/sal-data";
import { uploadMedia } from "@repo/storage";
import { pageBodies } from "./blocks";
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
import { prop, read, slugify } from "./props";
import { checkEvent, checkWaraq, type WaraqDesk } from "./rules";

/**
 * Events and Waraq pieces are written in Notion (Publishing). An event set
 * to "Ready to publish" is checked and published; "Cancel on the site"
 * cancels a published event. News ("News post" or "Waraq" pages) goes to
 * Waraq's newsroom, in Editing. The person who last edited the page must
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

const stamp = () => {
  const now = new Date().toISOString();
  return `${formatLongDate(now, "en")}, ${formatClock(now, "en")}`;
};

const needsChanges = async (
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
const editorEmail = async (ctx: SyncContext, page: NotionPage) => {
  const id = page.last_edited_by?.id;
  if (!id) {
    return null;
  }
  const user = await ctx.notion.user(id).catch(() => null);
  return user?.type === "person" ? (user.person?.email ?? null) : null;
};

const NO_EMAIL =
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

const publisherName = async (ctx: SyncContext, userId: string) => {
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

const programmeMap = async (ctx: SyncContext) =>
  new Map(
    [...(await linksOf(ctx, "programme")).entries()].map(([key, l]) => [
      l.notion_page_id,
      key,
    ])
  );

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

const bodiesOf = async (ctx: SyncContext, page: NotionPage) => {
  const bodies = pageBodies(await ctx.notion.blocks(page.id));
  // An empty page keeps the text already in the Diwan (rows that started
  // there, before anyone wrote them in Notion).
  return {
    ...(bodies.en ? { body_en: sanitizeRichText(bodies.en) } : {}),
    ...(bodies.ar ? { body_ar: sanitizeRichText(bodies.ar) } : {}),
  };
};

const publishedNote = (who: string) => `Published ${stamp()} by ${who}.`;

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

const publishEvent = async (
  ctx: SyncContext,
  page: NotionPage,
  email: string,
  programmes: ReadonlyMap<string, string>
) => {
  const checked = checkEvent(page, programmes);
  if (!checked.ok) {
    await needsChanges(ctx, page, checked.problems);
    return;
  }
  const v = checked.values;
  const publisher = await publisherFor(ctx, "event", email, v.programme_id);
  if (!publisher) {
    await needsChanges(ctx, page, [
      `${email} does not hold events.manage in the Diwan${v.programme_id ? " for this program" : ""}. Ask someone who does to set Ready to publish.`,
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
  const image = await copyImage(ctx, page, "Image", "events");
  const row = {
    ...v,
    ...(await bodiesOf(ctx, page)),
    ...(image ? { image_path: image } : {}),
    status: "published",
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
      })
      .select("id")
      .single();
    if (error) {
      throw error;
    }
    ({ id } = data);
  }
  await saveLink(ctx, "event", page.id, id, null);
  await ctx.notion.updatePage(page.id, {
    Nexus: prop.url(`${ctx.appUrl}/admin/events/edit?id=${id}`),
    "Nexus ID": prop.text(id),
    "Platform note": prop.text(
      publishedNote(await publisherName(ctx, publisher))
    ),
    "Public page": prop.url(`${ctx.webUrl}/events/${v.slug}`),
    Slug: prop.text(v.slug),
    Status: prop.select("Published"),
  });
  count(ctx, existing ? "event.republished" : "event.published");
};

/** The type a Notion piece starts as on each desk (editors change it). */
const STARTING_TYPE = {
  gallery: "art_photography",
  letters: "creative_nonfiction",
  news: "article",
  video: "video",
  voices: "column",
} as const satisfies Record<WaraqDesk, string>;

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
  const name = profile?.full_name_en?.trim() || "Waraq";
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

/**
 * Staff writing for Waraq (Kind "Waraq", or "News post" for the News desk):
 * imported as a piece in Editing,
 * where it goes through the same approvals as everything else. The person
 * who set Ready to publish needs the desk's permission (or journal.approve)
 * and becomes the byline. A page already imported updates its piece while
 * it is still in editing.
 */
const importWaraq = async (
  ctx: SyncContext,
  page: NotionPage,
  email: string,
  fallbackDesk?: WaraqDesk
) => {
  const checked = checkWaraq(page, fallbackDesk);
  if (!checked.ok) {
    await needsChanges(ctx, page, checked.problems);
    return;
  }
  const v = checked.values;
  const rpc = (permission: string) =>
    ctx.admin.schema("access").rpc("notion_publisher", {
      email,
      permission,
      scope_type: "global",
    });
  const [desk, chief] = await Promise.all([
    rpc(`journal.edit.${v.desk}`),
    rpc("journal.approve"),
  ]);
  const publisher = (desk.data ?? chief.data) as string | null;
  if (!publisher) {
    await needsChanges(ctx, page, [
      `${email} does not edit the ${v.desk} desk in the Diwan. Ask its editor or the Editor-in-Chief to set Ready to publish.`,
    ]);
    return;
  }
  const bodies = await bodiesOf(ctx, page);
  let language: "en" | "ar" | "bilingual" = "en";
  if (bodies.body_ar && bodies.body_en) {
    language = "bilingual";
  } else if (bodies.body_ar) {
    language = "ar";
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
    if (piece && !["editing", "author_approved"].includes(piece.status)) {
      await needsChanges(ctx, page, [
        "This piece is past editing in the Diwan. Change it there (or reopen it there first).",
      ]);
      return;
    }
    const { error } = await j
      .from("pieces")
      .update({
        deck_ar: v.deck_ar,
        deck_en: v.deck_en,
        publish_at: v.publish_at,
        title_ar: v.title_ar,
        title_en: v.title_en,
      })
      .eq("id", id);
    if (error) {
      throw error;
    }
    if (Object.keys(bodies).length > 0) {
      await j.from("piece_bodies").update(bodies).eq("piece_id", id);
    }
  } else {
    const { data, error } = await j
      .from("pieces")
      .insert({
        category: STARTING_TYPE[v.desk],
        contributor_id: await bylineFor(ctx, publisher),
        deck_ar: v.deck_ar,
        deck_en: v.deck_en,
        language,
        publish_at: v.publish_at,
        slug: await pieceSlug(ctx, v.title_en),
        status: "editing",
        title_ar: v.title_ar,
        title_en: v.title_en,
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
    Nexus: prop.url(`${ctx.appUrl}/admin/journal/piece?id=${id}`),
    "Nexus ID": prop.text(id),
    "Platform note": prop.text(
      `In the Qirtas newsroom since ${stamp()}, in Editing: the approvals and publishing happen in the Diwan.`
    ),
    Status: prop.select("In editing"),
  });
  count(ctx, existing ? "waraq.updated" : "waraq.imported");
};

const statusFilter = (statuses: string[]) => ({
  or: statuses.map((s) => ({ property: "Status", select: { equals: s } })),
});

/** Pages waiting for the platform, handled one at a time. */
export const publishWaiting = async (ctx: SyncContext) => {
  const programmes = await programmeMap(ctx);
  const [events, news, waraq] = await Promise.all([
    ctx.notion.query(ctx.sources.events, statusFilter([READY, CANCEL])),
    ctx.notion.query(ctx.sources.news, {
      and: [
        { property: "Kind", select: { equals: "News post" } },
        statusFilter([READY]),
      ],
    }),
    ctx.notion.query(ctx.sources.news, {
      and: [
        { property: "Kind", select: { equals: "Waraq" } },
        statusFilter([READY]),
      ],
    }),
  ]);
  const queue: [Kind | "news" | "waraq", NotionPage][] = [
    ...events.map((p): [Kind, NotionPage] => ["event", p]),
    ...news.map((p): ["news", NotionPage] => ["news", p]),
    ...waraq.map((p): ["waraq", NotionPage] => ["waraq", p]),
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
        await importWaraq(ctx, page, email);
      } else if (kind === "news") {
        // The old news posts are Waraq's News desk now.
        await importWaraq(ctx, page, email, "news");
      } else if (read.select(page, "Status") === CANCEL) {
        await cancelEvent(ctx, page, email);
      } else {
        await publishEvent(ctx, page, email, programmes);
      }
    } catch (error) {
      problem(ctx, `${kind} ${bareId(page.id)}: ${(error as Error).message}`);
    }
  }
};

const EVENT_STATUS: Record<string, string> = {
  cancelled: "Canceled",
  draft: "Planning",
  published: "Published",
};

const ADOPTED_NOTE =
  "Made in the Diwan; its text is still there. Write it here under English and العربية before publishing from here.";

const adoptEvents = async (ctx: SyncContext) => {
  const [events, links] = await Promise.all([
    ctx.admin
      .schema("events")
      .from("events")
      .select(
        "id, slug, title_en, title_ar, starts_at, ends_at, status, capacity"
      )
      .gte("starts_at", new Date(Date.now() - 30 * 86_400_000).toISOString()),
    linksOf(ctx, "event"),
  ]);
  for (const e of events.data ?? []) {
    if (links.has(e.id) || outOfTime(ctx)) {
      continue;
    }
    try {
      // biome-ignore lint/performance/noAwaitInLoops: rate-limited, sequential
      const page = await ctx.notion.createPage(ctx.sources.events, {
        Capacity: prop.number(e.capacity),
        Nexus: prop.url(`${ctx.appUrl}/admin/events/edit?id=${e.id}`),
        "Nexus ID": prop.text(e.id),
        "Platform note": prop.text(ADOPTED_NOTE),
        "Public page": prop.url(
          e.status === "published" ? `${ctx.webUrl}/events/${e.slug}` : null
        ),
        Slug: prop.text(e.slug),
        Status: prop.select(EVENT_STATUS[e.status] ?? "Planning"),
        Title: prop.title(e.title_en),
        "Title (Arabic)": prop.text(e.title_ar),
        When: prop.date(e.starts_at, e.ends_at),
      });
      await saveLink(ctx, "event", page.id, e.id, null);
      count(ctx, "event.adopted");
    } catch (error) {
      problem(ctx, `event ${e.id}: ${(error as Error).message}`);
    }
  }
};

/**
 * Events made in the Diwan get a page in Notion too, so the calendar is
 * complete and the team can take them over there. Their text stays in the
 * Nexus until someone writes it in the page.
 */
export const adoptNexusItems = async (ctx: SyncContext) => {
  await adoptEvents(ctx);
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
