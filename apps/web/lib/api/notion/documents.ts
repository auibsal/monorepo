import "server-only";

import { bareId, type NotionPage, pageUrl } from "./client";
import {
  count,
  dropLink,
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
import {
  checkDocument,
  type DocumentValues,
  languageOf,
  RETIRED_DOCUMENT_FAMILY,
} from "./rules";

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
 *
 * Each document has an English and an Arabic edition, separate rows with the
 * same Code (owner, Nov 7, 2026): the English row makes the Library's
 * record; the Arabic row adds its title, summary and text to it. A row in a
 * retired code family (SAL-PLT, POL, BRD …) is marked Retired. Every
 * document is proposed, Version 1, until the Founding Meeting adopts it,
 * and the Library says so.
 *
 * Both editions publish together (owner, Nov 7, 2026): publishing the
 * English row publishes its Arabic row in the same pass. The Arabic row
 * takes its Audience from the English row, so an internal document never
 * reaches the Library in either language, and a document set to internal
 * comes off the Library, both editions with it.
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

/** The row with the same Code in the other language, if there is one. */
const editionRow = async (
  ctx: SyncContext,
  code: string,
  language: "Arabic" | "English"
) => {
  const rows = await ctx.notion.query(ctx.sources.documents, {
    and: [
      { property: "Code", rich_text: { equals: code } },
      { property: "Language", select: { equals: language } },
    ],
  });
  return rows.find((row) => read.select(row, "Status") !== "Retired") ?? null;
};

/** An Arabic row's Audience is its English row's. */
const audienceOf = async (ctx: SyncContext, page: NotionPage) => {
  const own = read.select(page, "Audience");
  if (own || languageOf(page) !== "ar") {
    return own;
  }
  const code = read.text(page, "Code").toUpperCase();
  const english = code ? await editionRow(ctx, code, "English") : null;
  return english ? read.select(english, "Audience") : null;
};

/** Internal: kept in Notion only, and off the Library if it was there. */
const keepInternal = async (
  ctx: SyncContext,
  page: NotionPage,
  code: string,
  who: string
) => {
  if (languageOf(page) === "en") {
    const existing = await recordOf(ctx, page, code);
    if (existing) {
      const { error } = await ctx.admin
        .schema("governance")
        .from("society_documents")
        .delete()
        .eq("id", existing);
      if (error) {
        throw error;
      }
      await dropLink(ctx, page.id);
      count(ctx, "document.unpublished");
    }
  }
  await ctx.notion.updatePage(page.id, {
    Diwan: prop.url(null),
    "Diwan ID": prop.text(null),
    "Platform note": prop.text(
      `${publishedNote(who)} Internal: it is kept here in Notion only.`
    ),
    "Public page": prop.url(null),
    Status: prop.select("Published"),
  });
  count(ctx, "document.internal");
};

const publishDocument = async (
  ctx: SyncContext,
  page: NotionPage,
  email: string
) => {
  if (RETIRED_DOCUMENT_FAMILY.test(read.text(page, "Code").toUpperCase())) {
    await retireRow(ctx, page);
    return;
  }
  const checked = checkDocument(page, await audienceOf(ctx, page));
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
    await keepInternal(ctx, page, v.code, who);
    const arabic =
      languageOf(page) === "en"
        ? await editionRow(ctx, v.code, "Arabic")
        : null;
    if (arabic) {
      await keepInternal(ctx, arabic, v.code, who);
    }
    return;
  }
  if (languageOf(page) === "ar") {
    await publishArabicEdition(ctx, page, v, who);
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
    on_site: true,
    slug: v.slug,
    title_en: v.title,
    ...(v.summary ? { summary_en: v.summary } : {}),
    ...(v.dated ? { dated: v.dated } : {}),
    ...(v.keeper ? { owner: v.keeper } : {}),
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
    Diwan: prop.url(`${ctx.appUrl}/council/library/${v.slug}`),
    "Diwan ID": prop.text(data.id),
    "Platform note": prop.text(publishedNote(who)),
    "Public page": prop.url(`${ctx.webUrl}/library/${v.slug}`),
    Slug: prop.text(v.slug),
    Status: prop.select("Published"),
  });
  count(ctx, existing ? "document.republished" : "document.published");
  // The Arabic edition goes up with it.
  const arabic = await editionRow(ctx, v.code, "Arabic");
  if (arabic) {
    const edition = checkDocument(arabic, v.audience);
    await (edition.ok
      ? publishArabicEdition(ctx, arabic, edition.values, who)
      : needsChanges(ctx, arabic, edition.problems));
  }
};

/**
 * An Arabic edition: its English row (the same Code) must be published
 * first; the edition adds the Arabic title, summary and text to that record
 * and links to the Arabic Library page.
 */
const publishArabicEdition = async (
  ctx: SyncContext,
  page: NotionPage,
  edition: DocumentValues,
  who: string
) => {
  const body = await bodyOf(ctx, page);
  if (!body) {
    await needsChanges(ctx, page, [
      "The page is empty. Write the document's text in the page.",
    ]);
    return;
  }
  const docs = ctx.admin.schema("governance").from("society_documents");
  const { data: english } = await docs
    .select("id, slug")
    .eq("code", edition.code)
    .maybeSingle();
  if (!english) {
    await needsChanges(ctx, page, [
      `Publish the English row of ${edition.code} first; this edition then adds its Arabic.`,
    ]);
    return;
  }
  const { error } = await docs
    .update({
      body_ar: body,
      title_ar: edition.title,
      ...(edition.summary ? { summary_ar: edition.summary } : {}),
    })
    .eq("id", english.id);
  if (error) {
    throw error;
  }
  await ctx.notion.updatePage(page.id, {
    Diwan: prop.url(`${ctx.appUrl}/council/library/${english.slug}`),
    "Diwan ID": prop.text(english.id),
    "Platform note": prop.text(publishedNote(who)),
    "Public page": prop.url(`${ctx.webUrl}/ar/library/${english.slug}`),
    Slug: prop.text(english.slug),
    Status: prop.select("Published"),
  });
  count(ctx, "document.arabic");
};

/** A row in a retired code family: kept in Notion, off the Library. */
const retireRow = async (ctx: SyncContext, page: NotionPage) => {
  await ctx.notion.updatePage(page.id, {
    Diwan: prop.url(null),
    "Diwan ID": prop.text(null),
    "Platform note": prop.text(
      "Retired: this code family is retired (owner, Nov 7, 2026). Give the document its new code (SAL-GOV, EXB, EVT, MEM, PTN, MED, ART or EDT) to publish it."
    ),
    "Public page": prop.url(null),
    Status: prop.select("Retired"),
  });
  count(ctx, "document.retired");
};

const adoptionOf = (record: {
  adopted_on: string | null;
  vote: string | null;
}) => ({ adopted_on: record.adopted_on, vote: record.vote });

/**
 * Publishes the rows set to Ready to publish. The Library re-sync (owner,
 * Nov 7, 2026: run once right after production is unpaused, with
 * `?documents=all` on the sync route) takes every row already Published as
 * well, English rows first so each Arabic edition finds its record.
 */
export const publishDocuments = async (
  ctx: SyncContext,
  { all = false }: { all?: boolean } = {}
) => {
  const ready = { property: "Status", select: { equals: READY } };
  const found = await ctx.notion.query(
    ctx.sources.documents,
    all
      ? {
          or: [ready, { property: "Status", select: { equals: "Published" } }],
        }
      : ready
  );
  const pages = [...found].sort(
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
