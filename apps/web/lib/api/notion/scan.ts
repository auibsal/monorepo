import "server-only";

import { RETIRED_NAMES, TERMS_TO_CHECK } from "@/lib/data/retired-names";
import { pageHtml } from "./blocks";
import { bareId, type NotionPage } from "./client";
import { count, outOfTime, problem, type SyncContext } from "./context";
import { read } from "./props";

/**
 * Once a week (from Monday morning, over as many sync runs as it takes):
 * every Notion document page is read for the retired names (decisions.md,
 * Retired names), the terms in docs/platform/terms-to-check.md, and
 * personal data (an address, a phone number, an ID-like number, a name
 * from the Register), which never belongs in Notion (decisions.md, Where
 * things live). Each finding is listed on the Desk for the document's
 * keeper (core.document_scan_hits); what is found is masked.
 */

const STATE = "notion.scan_state";
const WEEK_MS = 7 * 86_400_000;

export interface Hit {
  found: string;
  keeper: string | null;
  kind: "personal_data" | "retired_name" | "term";
  notion_page_id: string;
  title: string;
  url: string;
}

interface ScanState {
  done: string[];
  finished_at?: string;
  hits: Hit[];
  started_at: string;
}

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/gu;
const PHONE = /(?:\+?964|\b0)7\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/gu;
// Seven digits or more on their own (an AUIB number, a passport, an ID).
const ID_LIKE = /(?<![\d/-])\d{7,}(?![\d/-])/gu;
const TAGS = /<[^>]+>/gu;
const SPACES = /\s+/gu;

/** An address or number shown by its shape, never in full. */
export const mask = (value: string) =>
  value.includes("@")
    ? `${value[0]}…@${value.split("@")[1]}`
    : `…${value.slice(-2)}`;

const initials = (name: string) =>
  name
    .split(SPACES)
    .map((part) => `${part[0] ?? ""}.`)
    .join(" ");

/** What one page's text holds. Names are the Register's full names. */
export const findIn = (
  text: string,
  names: readonly string[]
): Omit<Hit, "keeper" | "notion_page_id" | "title" | "url">[] => {
  const hits: Omit<Hit, "keeper" | "notion_page_id" | "title" | "url">[] = [];
  const retired = new RegExp(RETIRED_NAMES.source, "gu");
  for (const m of text.matchAll(retired)) {
    hits.push({ found: m[0], kind: "retired_name" });
  }
  const lower = text.toLowerCase();
  for (const term of TERMS_TO_CHECK) {
    if (lower.includes(term.toLowerCase())) {
      hits.push({ found: term, kind: "term" });
    }
  }
  for (const pattern of [EMAIL, PHONE, ID_LIKE]) {
    for (const m of text.matchAll(pattern)) {
      hits.push({ found: mask(m[0]), kind: "personal_data" });
    }
  }
  for (const name of names) {
    if (text.includes(name)) {
      hits.push({
        found: `a name in the Register (${initials(name)})`,
        kind: "personal_data",
      });
    }
  }
  // One line per finding on a page.
  const seen = new Set<string>();
  return hits.filter((h) => {
    const key = `${h.kind}:${h.found}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const readState = async (ctx: SyncContext) => {
  const { data } = await ctx.admin
    .schema("core")
    .from("settings")
    .select("value")
    .eq("key", STATE)
    .maybeSingle();
  return (data?.value ?? null) as ScanState | null;
};

const saveState = async (ctx: SyncContext, state: ScanState) => {
  await ctx.admin
    .schema("core")
    .from("settings")
    .upsert({
      description:
        "The weekly scan of Notion's documents in progress (pages read, findings so far); the findings are in core.document_scan_hits.",
      is_public: false,
      key: STATE,
      value: state as never,
    });
};

/** Full names in the Register, two words or more (no single first names). */
const registerNames = async (ctx: SyncContext) => {
  const { data } = await ctx.admin
    .schema("core")
    .from("profiles")
    .select("full_name_en, full_name_ar")
    .not("verified_at", "is", null);
  const names = (data ?? []).flatMap((p) => [p.full_name_en, p.full_name_ar]);
  return [
    ...new Set(
      names
        .map((n) => (n ?? "").trim())
        .filter((n) => n.split(SPACES).length >= 2)
    ),
  ];
};

const pageText = async (ctx: SyncContext, page: NotionPage) =>
  [read.text(page, "Title"), read.text(page, "Summary")]
    .concat(
      pageHtml(await ctx.notion.blocksWithTables(page.id)).replace(TAGS, " ")
    )
    .join(" ");

/** A new scan starts each Monday; until it is done, each run reads on. */
const due = (state: ScanState | null, now: Date) =>
  !state ||
  (state.finished_at
    ? now.getTime() - Date.parse(state.started_at) >= WEEK_MS
    : true);

const finish = async (ctx: SyncContext, state: ScanState) => {
  const table = ctx.admin.schema("core").from("document_scan_hits");
  const { error } = await table.delete().gte("scanned_at", "1970-01-01");
  if (error) {
    throw error;
  }
  if (state.hits.length > 0) {
    const { error: written } = await table.insert(state.hits);
    if (written) {
      throw written;
    }
  }
  await saveState(ctx, { ...state, finished_at: new Date().toISOString() });
  count(ctx, "scan.hits", state.hits.length);
};

export const scanDocuments = async (ctx: SyncContext, now = new Date()) => {
  let state = await readState(ctx);
  if (!due(state, now)) {
    return;
  }
  if (!state || state.finished_at) {
    state = { done: [], hits: [], started_at: now.toISOString() };
  }
  const [rows, names] = await Promise.all([
    ctx.notion.query(ctx.sources.documents),
    registerNames(ctx),
  ]);
  const done = new Set(state.done);
  let stopped = false;
  for (const page of rows) {
    if (outOfTime(ctx)) {
      stopped = true;
      break;
    }
    const id = bareId(page.id);
    if (done.has(id)) {
      continue;
    }
    try {
      // biome-ignore lint/performance/noAwaitInLoops: rate-limited, sequential
      const text = await pageText(ctx, page);
      const title = read.text(page, "Title") || id;
      for (const hit of findIn(text, names)) {
        state.hits.push({
          ...hit,
          keeper: read.select(page, "Owner"),
          notion_page_id: id,
          title: title.slice(0, 300),
          url: `https://www.notion.so/${id}`,
        });
      }
    } catch (error) {
      problem(ctx, `scan ${id}: ${(error as Error).message}`);
    }
    state.done.push(id);
    count(ctx, "scan.read");
  }
  // Out of time: the next run reads on from here.
  await (stopped ? saveState(ctx, state) : finish(ctx, state));
};
