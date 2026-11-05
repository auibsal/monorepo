import sanitizeHtml from "sanitize-html";

/**
 * The one HTML policy for rich text (news, pieces, submissions). Applied
 * when saving and again when rendering. No scripts, styles, iframes or
 * event handlers; links get rel="noopener noreferrer nofollow".
 */
const options: sanitizeHtml.IOptions = {
  allowedAttributes: {
    "*": ["lang", "dir"],
    a: ["href", "title", "lang", "dir", "rel"],
    td: ["colspan", "rowspan", "lang", "dir"],
    th: ["colspan", "rowspan", "scope", "lang", "dir"],
  },
  allowedSchemes: ["https", "mailto"],
  allowedTags: [
    "p",
    "br",
    "hr",
    "h2",
    "h3",
    "h4",
    "blockquote",
    "ul",
    "ol",
    "li",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "sup",
    "sub",
    "a",
    "span",
    "figure",
    "figcaption",
    // Pull quotes and notes (design review A13): a pull quote is an aside;
    // a note is written where it belongs, in <small>, and the reader numbers
    // it and lists it after the text (`withNotes`).
    "aside",
    "small",
    "pre",
    "code",
    // Society documents (Constitution, Bylaws, handbooks).
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ],
  disallowedTagsMode: "discard",
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      rel: "noopener noreferrer nofollow",
    }),
  },
};

export const sanitizeRichText = (html: string | null | undefined) =>
  sanitizeHtml(html ?? "", options);

/** Plain text from rich text, for excerpts and search snippets. */
export const toPlainText = (html: string | null | undefined) =>
  sanitizeHtml(html ?? "", { allowedAttributes: {}, allowedTags: [] })
    .replace(/\s+/g, " ")
    .trim();

const NOTE = /<small(?:\s[^>]*)?>([\s\S]*?)<\/small>/g;

/**
 * Notes in rich text (design review A13): each <small> written in the text
 * becomes a numbered reference, and its words a note after the text. Runs
 * on sanitized HTML; `prefix` keeps the anchors apart when a page shows
 * more than one text.
 */
export const withNotes = (html: string, prefix: string) => {
  const notes: { html: string; id: string; ref: string }[] = [];
  const body = html.replace(NOTE, (_match, note: string) => {
    const n = notes.length + 1;
    const id = `${prefix}-note-${n}`;
    const ref = `${prefix}-ref-${n}`;
    notes.push({ html: note, id, ref });
    return `<sup id="${ref}"><a href="#${id}">${n}</a></sup>`;
  });
  return { body, notes };
};

const HEADING = /<h2(?:\s[^>]*)?>([\s\S]*?)<\/h2>/g;

/**
 * A long read's contents (design review A15): each <h2> of the sanitized
 * text gets an anchor, and its words a line in the contents. `prefix`
 * keeps the anchors apart when a page shows more than one text.
 */
export const withContents = (html: string, prefix: string) => {
  const contents: { id: string; text: string }[] = [];
  const body = html.replace(HEADING, (match, inner: string) => {
    const text = toPlainText(inner);
    if (!text) {
      return match;
    }
    const id = `${prefix}-part-${contents.length + 1}`;
    contents.push({ id, text });
    return match.replace("<h2", `<h2 id="${id}"`);
  });
  return { body, contents };
};

const FIGURE_MARK =
  /<p(?:\s[^>]*)?>\s*\[(?:figure|شكل)\s*(\d{1,2})\]\s*<\/p>/gi;

export type TextPart = { html: string } | { figure: number };

/**
 * An explainer's figures in place (design review A16): a paragraph of its
 * own reading "[figure 2]" («[شكل 2]») becomes figure 2; the text around
 * it stays as it was. Runs on sanitized HTML.
 */
export const splitAtFigures = (html: string): TextPart[] => {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of html.matchAll(FIGURE_MARK)) {
    const at = match.index ?? 0;
    if (at > last) {
      parts.push({ html: html.slice(last, at) });
    }
    parts.push({ figure: Number(match[1]) });
    last = at + match[0].length;
  }
  if (last < html.length) {
    parts.push({ html: html.slice(last) });
  }
  return parts;
};
