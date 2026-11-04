import "server-only";

import { bareId, type NotionPage } from "./client";
import {
  count,
  outOfTime,
  problem,
  recordFor,
  type SyncContext,
  saveLink,
} from "./context";
import { prop, read } from "./props";
import {
  editorEmail,
  NO_EMAIL,
  needsChanges,
  publishedNote,
  publisherName,
} from "./publish";
import { checkProgram, editionOf, languageOf } from "./rules";

/**
 * The six programs are written in Notion (Publishing, Programs; owner,
 * Nov 4, 2026). A row set to Ready to publish gives its program's name,
 * summary and rhythm to the site, which builds /events/<program> from
 * them; an Arabic edition row gives their Arabic. Rows keep the page ids
 * the Events and Projects databases link to, matched to core.programmes
 * through core.notion_links. The person who set the status needs
 * programmes.manage in the Diwan.
 */

const READY = "Ready to publish";

const publisherFor = async (
  ctx: SyncContext,
  email: string,
  programmeId: string | null
) => {
  const { data } = await ctx.admin.schema("access").rpc("notion_publisher", {
    email,
    permission: "programmes.manage",
    scope_id: programmeId ?? undefined,
    scope_type: programmeId ? "programme" : "global",
  });
  return (data as string | null) ?? null;
};

/** The program a row stands for: its link, else the Diwan ID it carries. */
const programmeFor = async (ctx: SyncContext, page: NotionPage) => {
  const linked = await recordFor(ctx, "programme", page.id);
  if (linked) {
    return linked;
  }
  const given = read.text(page, "Diwan ID");
  if (!given) {
    return null;
  }
  const { data } = await ctx.admin
    .schema("core")
    .from("programmes")
    .select("id")
    .eq("id", given)
    .maybeSingle();
  return data?.id ?? null;
};

const publishEnglish = async (
  ctx: SyncContext,
  page: NotionPage,
  email: string
) => {
  const checked = checkProgram(page);
  if (!checked.ok) {
    await needsChanges(ctx, page, checked.problems);
    return;
  }
  const v = checked.values;
  const existing = await programmeFor(ctx, page);
  const publisher = await publisherFor(ctx, email, existing);
  if (!publisher) {
    await needsChanges(ctx, page, [
      `${email} does not hold programmes.manage in the Diwan${existing ? " for this program" : ""}. Ask the Director of Programs to set Ready to publish.`,
    ]);
    return;
  }
  const values = {
    is_active: true,
    name_en: v.name,
    rhythm_en: v.rhythm,
    summary_en: v.summary,
  };
  let id = existing;
  let { slug } = v;
  if (id) {
    const { data, error } = await ctx.admin
      .schema("core")
      .from("programmes")
      .update(values)
      .eq("id", id)
      .select("slug")
      .single();
    if (error) {
      throw error;
    }
    // A program keeps its address: events and links point at it.
    ({ slug } = data);
  } else {
    const { data, error } = await ctx.admin
      .schema("core")
      .from("programmes")
      .insert({ ...values, kind: "format", name_ar: v.name, slug: v.slug })
      .select("id")
      .single();
    if (error) {
      throw error;
    }
    ({ id } = data);
  }
  await saveLink(ctx, "programme", page.id, id, null);
  await ctx.notion.updatePage(page.id, {
    Diwan: prop.url(`${ctx.appUrl}/events/${slug}`),
    "Diwan ID": prop.text(id),
    "Platform note": prop.text(
      publishedNote(await publisherName(ctx, publisher))
    ),
    "Public page": prop.url(`${ctx.webUrl}/events/${slug}`),
    Status: prop.select("Published"),
  });
  count(ctx, existing ? "programme.republished" : "programme.published");
};

/** An Arabic edition row: the program's Arabic name, summary and rhythm. */
const publishArabic = async (
  ctx: SyncContext,
  page: NotionPage,
  email: string
) => {
  const problems: string[] = [];
  const of = editionOf(page, problems);
  const name = read.text(page, "Name");
  if (!name) {
    problems.push("Add the Arabic name.");
  }
  const programmeId = of ? await recordFor(ctx, "programme", of) : null;
  if (of && !programmeId) {
    problems.push("Publish the English row (Edition of) first.");
  }
  if (problems.length > 0 || !programmeId) {
    await needsChanges(ctx, page, problems);
    return;
  }
  const publisher = await publisherFor(ctx, email, programmeId);
  if (!publisher) {
    await needsChanges(ctx, page, [
      `${email} does not hold programmes.manage in the Diwan for this program.`,
    ]);
    return;
  }
  const rhythm = read.text(page, "Rhythm");
  const summary = read.text(page, "Summary");
  const { data, error } = await ctx.admin
    .schema("core")
    .from("programmes")
    .update({
      name_ar: name,
      ...(rhythm ? { rhythm_ar: rhythm } : {}),
      ...(summary ? { summary_ar: summary } : {}),
    })
    .eq("id", programmeId)
    .select("slug")
    .single();
  if (error) {
    throw error;
  }
  await saveLink(ctx, "programme_ar", page.id, programmeId, null);
  await ctx.notion.updatePage(page.id, {
    Diwan: prop.url(`${ctx.appUrl}/events/${data.slug}`),
    "Diwan ID": prop.text(programmeId),
    "Platform note": prop.text(
      publishedNote(await publisherName(ctx, publisher))
    ),
    "Public page": prop.url(`${ctx.webUrl}/ar/events/${data.slug}`),
    Status: prop.select("Published"),
  });
  count(ctx, "programme_ar.published");
};

export const publishPrograms = async (ctx: SyncContext) => {
  const pages = await ctx.notion.query(ctx.sources.programmes, {
    property: "Status",
    select: { equals: READY },
  });
  // English rows first, so an edition finds its program in the same run.
  pages.sort(
    (a, b) => Number(languageOf(a) === "ar") - Number(languageOf(b) === "ar")
  );
  for (const page of pages) {
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
      await (languageOf(page) === "ar"
        ? publishArabic(ctx, page, email)
        : publishEnglish(ctx, page, email));
    } catch (error) {
      problem(ctx, `program ${bareId(page.id)}: ${(error as Error).message}`);
    }
  }
};
