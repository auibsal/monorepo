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
    .replace(/\s+/gu, " ")
    .trim();

const SPACE = /\s/u;

interface Element {
  /** Where the element ends, after its closing tag. */
  end: number;
  /** The HTML between its tags. */
  inner: string;
  /** The whole element, opening tag to closing tag. */
  outer: string;
  /** Where its opening tag starts. */
  start: number;
}

/**
 * Each <tag>…</tag> in sanitized HTML, in order, the content ending at the
 * first closing tag. A scan with indexOf rather than a regular expression:
 * each character is read a bounded number of times, so text crafted with
 * many unclosed tags can't make it slow (CodeQL js/polynomial-redos).
 */
function* elements(html: string, tag: string): Generator<Element> {
  const open = `<${tag}`;
  const close = `</${tag}>`;
  let from = 0;
  while (from < html.length) {
    const start = html.indexOf(open, from);
    if (start < 0) {
      return;
    }
    const after = html.charAt(start + open.length);
    if (!(after === ">" || SPACE.test(after))) {
      from = start + open.length;
      continue;
    }
    const openEnd = html.indexOf(">", start + open.length);
    if (openEnd < 0) {
      return;
    }
    const closeAt = html.indexOf(close, openEnd + 1);
    if (closeAt < 0) {
      return;
    }
    const end = closeAt + close.length;
    yield {
      end,
      inner: html.slice(openEnd + 1, closeAt),
      outer: html.slice(start, end),
      start,
    };
    from = end;
  }
}

/** Replaces each <tag>…</tag> with what `replace` returns for it. */
const replaceElements = (
  html: string,
  tag: string,
  replace: (element: Element) => string
) => {
  let out = "";
  let last = 0;
  for (const element of elements(html, tag)) {
    out += html.slice(last, element.start) + replace(element);
    last = element.end;
  }
  return out + html.slice(last);
};

/**
 * Notes in rich text (design review A13): each <small> written in the text
 * becomes a numbered reference, and its words a note after the text. Runs
 * on sanitized HTML; `prefix` keeps the anchors apart when a page shows
 * more than one text.
 */
export const withNotes = (html: string, prefix: string) => {
  const notes: { html: string; id: string; ref: string }[] = [];
  const body = replaceElements(html, "small", ({ inner: note }) => {
    const n = notes.length + 1;
    const id = `${prefix}-note-${n}`;
    const ref = `${prefix}-ref-${n}`;
    notes.push({ html: note, id, ref });
    return `<sup id="${ref}"><a href="#${id}">${n}</a></sup>`;
  });
  return { body, notes };
};

/**
 * A long read's contents (design review A15): each <h2> of the sanitized
 * text gets an anchor, and its words a line in the contents. `prefix`
 * keeps the anchors apart when a page shows more than one text.
 */
export const withContents = (html: string, prefix: string) => {
  const contents: { id: string; text: string }[] = [];
  const body = replaceElements(html, "h2", ({ inner, outer: match }) => {
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

/** A paragraph's whole text reading "[figure 2]" («[شكل 2]»). */
const FIGURE_MARK = /^\s*\[(?:figure|شكل)\s*(\d{1,2})\]\s*$/iu;

export type TextPart = { html: string } | { figure: number };

/**
 * An explainer's figures in place (design review A16): a paragraph of its
 * own reading "[figure 2]" («[شكل 2]») becomes figure 2; the text around
 * it stays as it was. Runs on sanitized HTML.
 */
export const splitAtFigures = (html: string): TextPart[] => {
  const parts: TextPart[] = [];
  let last = 0;
  for (const paragraph of elements(html, "p")) {
    const mark = FIGURE_MARK.exec(paragraph.inner);
    if (!mark) {
      continue;
    }
    if (paragraph.start > last) {
      parts.push({ html: html.slice(last, paragraph.start) });
    }
    parts.push({ figure: Number(mark[1]) });
    last = paragraph.end;
  }
  if (last < html.length) {
    parts.push({ html: html.slice(last) });
  }
  return parts;
};
