import { type Client, unwrap } from "./client";
import { sanitizeRichText, toPlainText } from "./sanitize";

/**
 * The Library (governance.society_documents): the Society's documents, all
 * public, at auibsal.org/library. Internal documents are kept in the team's
 * Notion workspace, never here (owner, Oct 30, 2026). Each page shows the
 * status recorded here and nothing else, so a proposed document is never presented as
 * adopted. The text is written in Notion and rendered here by the sync
 * (Nov 4, 2026); governance managers keep the adoption record (status,
 * version, the date and the vote) in the Diwan's Library.
 */
export const documentStatuses = ["proposed", "adopted", "superseded"] as const;
export type DocumentStatus = (typeof documentStatuses)[number];

export interface SalDocument {
  adopted_on: string | null;
  audience: string;
  body_ar?: string | null;
  body_en?: string;
  code: string;
  dated: string | null;
  id: string;
  notion_url?: string | null;
  ratification: string | null;
  slug: string;
  sort: number;
  status: string;
  summary_ar: string | null;
  summary_en: string | null;
  title_ar: string | null;
  title_en: string;
  updated_at: string;
  version: string | null;
  vote?: string | null;
}

const LISTING =
  "id, slug, code, title_en, title_ar, summary_en, summary_ar, audience, status, version, dated, ratification, adopted_on, vote, sort, updated_at, notion_url";

/** The public documents, without their text (for listings and the sitemap). */
export const publicDocuments = async (client: Client) =>
  (unwrap(
    await client
      .schema("governance")
      .from("society_documents")
      .select(LISTING)
      .eq("audience", "public")
      .order("sort")
  ) ?? []) as SalDocument[];

/** One document with its text, if the reader may see it. */
export const documentBySlug = async (client: Client, slug: string) =>
  (unwrap(
    await client
      .schema("governance")
      .from("society_documents")
      .select("*")
      .eq("slug", slug)
      .maybeSingle()
  ) ?? null) as SalDocument | null;

/** Every document, drafts included for those who keep them (the Diwan). */
export const allDocuments = async (client: Client) =>
  (unwrap(
    await client
      .schema("governance")
      .from("society_documents")
      .select(LISTING)
      .order("sort")
  ) ?? []) as SalDocument[];

/** The website's policies (owner, Nov 7, 2026): the Privacy Notice, the
 * Terms of Use and the Accessibility Statement. */
const WEBSITE_POLICIES = new Set(["SAL-GOV-04", "SAL-GOV-05", "SAL-GOV-06"]);

/**
 * The Library keeps two shelves (owner, Oct 30, 2026): the Society's own
 * documents, and the website's policies (SAL-GOV-04 to 06).
 */
export const isWebsitePolicy = (doc: Pick<SalDocument, "code">) =>
  WEBSITE_POLICIES.has(doc.code);

/** The title in the page's language (English when there is no Arabic). */
export const documentTitle = (
  doc: Pick<SalDocument, "title_ar" | "title_en">,
  locale: string
) => (locale === "ar" && doc.title_ar ? doc.title_ar : doc.title_en);

/** The summary in the page's language only (never the other language's). */
export const documentSummary = (
  doc: Pick<SalDocument, "summary_ar" | "summary_en">,
  locale: string
) => (locale === "ar" ? doc.summary_ar : doc.summary_en) ?? "";

/** The text in the page's language, and whether it fell back to English. */
export const documentBody = (
  doc: Pick<SalDocument, "body_ar" | "body_en">,
  locale: string
) => {
  const arabic = locale === "ar" && doc.body_ar?.trim() ? doc.body_ar : null;
  return { english: !arabic, html: arabic ?? doc.body_en ?? "" };
};

const HEADING = /<h2>([\s\S]*?)<\/h2>/g;
const ENTITIES: Record<string, string> = {
  "&#39;": "'",
  "&#x27;": "'",
  "&amp;": "&",
  "&gt;": ">",
  "&lt;": "<",
  "&quot;": '"',
};
const ENTITY = /&(?:#x27|#39|amp|gt|lt|quot);/g;

// Tags are stripped by the sanitizer (never by a regex); the entities it
// leaves are decoded for the table of contents, which React escapes again.
const plain = (html: string) =>
  toPlainText(html).replace(ENTITY, (e) => ENTITIES[e] ?? e);

const anchor = (text: string, index: number) =>
  `${index + 1}-${text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)}`;

/** Another public document a document's text may point to. */
export interface DocumentRef {
  href: string;
  title: string;
}

const CODE = /SAL-[A-Z]{3}-\d{2}/;
const CODES = /SAL-[A-Z]{3}-\d{2}/g;
const OPENING_PARAGRAPH = /^\s*<p>([\s\S]*?)<\/p>/;
// The lines a Notion page opens with for its editors: the other edition's
// page, and the code, version and owner (the Library shows its own).
const EDITORS_LINE =
  /^(?:English edition|Arabic edition|النسخة العربية|النسخة الإنجليزية)\s*:|^SAL-[A-Z]{3}-\d{2}\s*·/;
const NOTION_LINK =
  /(\s*)<a\b[^>]*href="https:\/\/(?:app\.|www\.)?notion\.(?:so|com|site)[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
const TAG = /(<[^>]+>)/;
const OPEN_LINK = /^<a\b/i;
const CLOSE_LINK = /^<\/a>/i;

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const dropEditorsLines = (html: string) => {
  let rest = html;
  for (;;) {
    const first = OPENING_PARAGRAPH.exec(rest);
    if (!(first && EDITORS_LINE.test(plain(first[1] ?? "")))) {
      return rest;
    }
    rest = rest.slice(first[0].length);
  }
};

/**
 * Links into Notion lead staff to the working copy, which readers can't
 * open: a link that repeats the words before it ("SAL-GOV-03 Policy Manual
 * <a>Policy Manual</a>") goes, any other keeps its words without the link.
 */
const dropNotionLinks = (
  html: string,
  pages: ReadonlyMap<string, DocumentRef> = new Map()
) =>
  html.replace(
    NOTION_LINK,
    (match, space: string, inner: string, offset: number) => {
      // A link to another document's Notion page becomes a link to that
      // document in the Library (the links #234 had dropped).
      const target = pages.get(notionPageId(match) ?? "");
      if (target) {
        return `${space}<a href="${target.href}">${inner}</a>`;
      }
      const words = plain(inner);
      const before = plain(html.slice(Math.max(0, offset - 200), offset));
      // The link's own (already sanitized) contents stay; only the <a> goes.
      return words && before.endsWith(words) ? "" : `${space}${inner}`;
    }
  );

const NOTION_ID = /([0-9a-f]{32})(?:[?#"]|$)/;
const DASHES = /-/g;

/** A Notion page's id (32 hex digits) from a link or page address. */
export const notionPageId = (link: string | null | undefined) => {
  const match = NOTION_ID.exec((link ?? "").replace(DASHES, ""));
  return match?.[1] ?? null;
};

/**
 * A code that names a public document links to it in the Library, with the
 * title after it when the text gives one ("SAL-GOV-03 Policy Manual").
 */
const linkCodesIn = (text: string, refs: ReadonlyMap<string, DocumentRef>) => {
  let out = "";
  let at = 0;
  for (const match of text.matchAll(CODES)) {
    const [code] = match;
    const start = match.index ?? 0;
    const ref = refs.get(code);
    if (!ref) {
      continue;
    }
    const title = ` ${escapeHtml(ref.title)}`;
    const titled = text.startsWith(title, start + code.length);
    const end = start + code.length + (titled ? title.length : 0);
    out += `${text.slice(at, start)}<a href="${ref.href}">${text.slice(start, end)}</a>`;
    at = end;
  }
  return out + text.slice(at);
};

const linkCodes = (html: string, refs: ReadonlyMap<string, DocumentRef>) => {
  if (refs.size === 0) {
    return html;
  }
  let inLink = 0;
  return html
    .split(TAG)
    .map((part) => {
      if (part.startsWith("<")) {
        if (OPEN_LINK.test(part)) {
          inLink += 1;
        } else if (CLOSE_LINK.test(part)) {
          inLink = Math.max(0, inLink - 1);
        }
        return part;
      }
      return inLink > 0 || !CODE.test(part) ? part : linkCodesIn(part, refs);
    })
    .join("");
};

/**
 * Sanitized document HTML with an id on every section heading, and the
 * table of contents built from those headings. The editors' opening lines
 * and links into Notion are left out; codes of public documents link to
 * them (`refs`, by code).
 */
export const documentSections = (
  html: string,
  refs: ReadonlyMap<string, DocumentRef> = new Map(),
  /** Other documents by their Notion page id (`notionPageId`). */
  pages: ReadonlyMap<string, DocumentRef> = new Map()
) => {
  const safe = linkCodes(
    dropNotionLinks(dropEditorsLines(sanitizeRichText(html)), pages),
    refs
  );
  const contents: { id: string; title: string }[] = [];
  let index = 0;
  const withIds = safe.replace(HEADING, (_match, inner: string) => {
    const title = plain(inner);
    const id = anchor(title, index);
    index += 1;
    contents.push({ id, title });
    return `<h2 id="${id}">${inner}</h2>`;
  });
  return { contents, html: withIds };
};
