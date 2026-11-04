import "server-only";

import { bareId, type NotionPage, pageUrl } from "./client";
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
import {
  bodyOf,
  editorEmail,
  NO_EMAIL,
  needsChanges,
  publishedNote,
  publisherName,
} from "./publish";
import { checkDocument } from "./rules";

/**
 * The Society's documents are written in Notion (Publishing, Documents;
 * owner, Nov 4, 2026). A row set to Ready to publish is rendered to
 * auibsal.org/library/<slug> when its Audience is public; internal
 * documents stay in Notion. The site keeps only each document's adoption
 * record (adopted on and the vote, `adopted_on` and `vote`), kept
 * in the Diwan's Library and written back to the row. The text on the
 * site is a rendering of the page and is never edited there. The person
 * who set the status needs governance.manage (the President, the Vice
 * President and the General Secretary).
 */

const READY = "Ready to publish";

const publisherFor = async (ctx: SyncContext, email: string) => {
  const { data } = await ctx.admin.schema("access").rpc("notion_publisher", {
    email,
    permission: "governance.manage",
    scope_type: "global",
  });
  return (data as string | null) ?? null;
};

/** The site record a row stands for: its link, its Diwan ID or its code. */
const recordOf = async (ctx: SyncContext, page: NotionPage, code: string) => {
  const linked = await recordFor(ctx, "document", page.id);
  if (linked) {
    return linked;
  }
  const docs = ctx.admin.schema("governance").from("society_documents");
  const given = read.text(page, "Diwan ID");
  if (given) {
    const { data } = await docs.select("id").eq("id", given).maybeSingle();
    if (data) {
      return data.id;
    }
  }
  const { data } = await docs.select("id").eq("code", code).maybeSingle();
  return data?.id ?? null;
};

const adoptionProps = (record: {
  adopted_on: string | null;
  vote: string | null;
}) => ({
  "Adopted on": prop.date(record.adopted_on),
  Vote: prop.text(record.vote),
});

const publishDocument = async (
  ctx: SyncContext,
  page: NotionPage,
  email: string
) => {
  const checked = checkDocument(page);
  if (!checked.ok) {
    await needsChanges(ctx, page, checked.problems);
    return;
  }
  const v = checked.values;
  const publisher = await publisherFor(ctx, email);
  if (!publisher) {
    await needsChanges(ctx, page, [
      `${email} does not hold governance.manage in the Diwan. Ask the President, the Vice President or the General Secretary to set Ready to publish.`,
    ]);
    return;
  }
  const who = await publisherName(ctx, publisher);
  if (v.audience === "internal") {
    await ctx.notion.updatePage(page.id, {
      "Platform note": prop.text(
        `${publishedNote(who)} Internal: it is kept here in Notion only.`
      ),
      "Public page": prop.url(null),
      Status: prop.select("Published"),
    });
    count(ctx, "document.internal");
    return;
  }
  const body = await bodyOf(ctx, page);
  if (!body) {
    await needsChanges(ctx, page, [
      "The page is empty. Write the document's text in the page.",
    ]);
    return;
  }
  const docs = ctx.admin.schema("governance").from("society_documents");
  const existing = await recordOf(ctx, page, v.code);
  const values = {
    audience: "public",
    body_en: body,
    code: v.code,
    notion_url: pageUrl(page.id),
    slug: v.slug,
    title_en: v.title,
    ...(v.summary ? { summary_en: v.summary } : {}),
    ...(v.dated ? { dated: v.dated } : {}),
  };
  const { data, error } = existing
    ? await docs
        .update(values)
        .eq("id", existing)
        .select("id, adopted_on, vote")
        .single()
    : await docs.insert(values).select("id, adopted_on, vote").single();
  if (error) {
    throw error;
  }
  await saveLink(ctx, "document", page.id, data.id, hashOf(adoptionOf(data)));
  await ctx.notion.updatePage(page.id, {
    ...adoptionProps(data),
    Diwan: prop.url(`${ctx.appUrl}/society/library/${v.slug}`),
    "Diwan ID": prop.text(data.id),
    "Platform note": prop.text(publishedNote(who)),
    "Public page": prop.url(`${ctx.webUrl}/library/${v.slug}`),
    Slug: prop.text(v.slug),
    Status: prop.select("Published"),
  });
  count(ctx, existing ? "document.republished" : "document.published");
};

const adoptionOf = (record: {
  adopted_on: string | null;
  vote: string | null;
}) => ({ adopted_on: record.adopted_on, vote: record.vote });

export const publishDocuments = async (ctx: SyncContext) => {
  const pages = await ctx.notion.query(ctx.sources.documents, {
    property: "Status",
    select: { equals: READY },
  });
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
      await publishDocument(ctx, page, email);
    } catch (error) {
      problem(ctx, `document ${bareId(page.id)}: ${(error as Error).message}`);
    }
  }
};

/**
 * The adoption record is the site's (the Diwan's Library): when a
 * document's adoption date or vote changes there, the row in Notion is
 * brought up to date.
 */
export const syncAdoptionRecords = async (ctx: SyncContext) => {
  const links = await linksOf(ctx, "document");
  if (links.size === 0) {
    return;
  }
  const { data, error: loadError } = await ctx.admin
    .schema("governance")
    .from("society_documents")
    .select("id, adopted_on, vote")
    .in("id", [...links.keys()]);
  if (loadError) {
    throw loadError;
  }
  for (const record of data ?? []) {
    const link = links.get(record.id);
    const marker = hashOf(adoptionOf(record));
    if (!link || link.content_hash === marker || outOfTime(ctx)) {
      continue;
    }
    try {
      // biome-ignore lint/performance/noAwaitInLoops: rate-limited, sequential
      await ctx.notion.updatePage(link.notion_page_id, adoptionProps(record));
      await saveLink(ctx, "document", link.notion_page_id, record.id, marker);
      count(ctx, "document.adoption");
    } catch (error) {
      problem(ctx, `adoption ${record.id}: ${(error as Error).message}`);
    }
  }
};
