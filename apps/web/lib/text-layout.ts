/**
 * A manuscript's text, laid out again as the writer wrote it.
 *
 * For a PDF: lines in reading order (right to left for Arabic), a line
 * break kept wherever the writer made one (verse, titles, the end of a
 * paragraph) and a wrap joined wherever the page made one, stanzas and
 * paragraphs where the space between lines grows, headings by their size,
 * verse indents kept, and no page numbers or running heads. For a Word
 * file: each paragraph's direction and its indents.
 *
 * It works on PDF.js's text items, so the browser and the tests read a
 * PDF the same way. Pure: no PDF.js here, so it is tested on exact
 * positions.
 */

/** One run of text as PDF.js gives it, in page units (y grows upward). */
export interface TextItem {
  /** From a bold face. */
  bold?: boolean;
  dir?: string;
  height: number;
  /** Drawn slanted (a synthetic italic) or from an italic face. */
  italic?: boolean;
  str: string;
  width: number;
  x: number;
  y: number;
}

/** One page as PDF.js read it: its text items and its width. */
export interface TextPage {
  items: TextItem[];
  width?: number;
}

interface Run {
  bold: boolean;
  italic: boolean;
  text: string;
}

interface Line {
  /** It has a gap of more than two ems: halves of a line, never a wrap. */
  halves: boolean;
  left: number;
  right: number;
  rtl: boolean;
  runs: Run[];
  size: number;
  y: number;
}

interface Block {
  heading: boolean;
  /** Each line's indent from the column's start, in page units. */
  indents: number[];
  joins: boolean[];
  lines: Line[];
}

/** A page's lines and, when known, its width (for the column's far edge). */
interface PageLines {
  lines: Line[];
  width?: number;
}

interface Column {
  end: number;
  /** The text never reached a margin (a centered poem): nothing wrapped. */
  narrow: boolean;
  start: number;
}

const MARK = /^\p{M}+$/u;
const LETTER = /\p{L}/u;
const LETTER_OR_MARK = /[\p{L}\p{M}]/u;
const CONTROL = /\p{Cc}/gu;
const MARK_FIRST = /(^|\s)(\p{M}+)(\p{L})/gu;
const RTL_CHAR = /[֐-ࣿיִ-﷿ﹰ-ﻼ]/u;
const LTR_CHAR = /[\p{Script=Latin}\p{Nd}]/u;
const PAGE_NUMBER =
  /^[\s\-–—]*(?:page ?)?[\d٠-٩۰-۹]+(?: ?(?:\/|of|من) ?[\d٠-٩۰-۹]+)?[\s\-–—]*$/iu;
const DIGITS = /[\d٠-٩۰-۹]+/gu;
const HAS_DIGIT = /[\d٠-٩۰-۹]/u;
const HYPHEN_END = /[-­‐]$/u;
const HYPHEN_TAIL = /[-­‐]((<\/(em|strong)>)*)$/u;
const LOWER_START = /^\p{Ll}/u;
const SPACE_EDGE = /^\s|\s$/u;
const SPACES = /\s+/u;
const ITALIC_FACE = /italic|oblique|slanted/iu;
const BOLD_FACE = /bold|black|heavy|semibold|demi/iu;
const BLOCK_TAGS = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "blockquote",
];
const LEADING = /(^|<br \/>|<br>)([ \t]{2,}|\t)/gu;
const EM_SPACE = " ";

const median = (values: number[]) => {
  const sorted = values.filter((v) => v > 0).toSorted((a, b) => a - b);
  return sorted.length === 0
    ? 0
    : (sorted[Math.floor((sorted.length - 1) / 2)] ?? 0);
};

const escapeHtml = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

/** Whether most of a text's letters are Arabic (or Hebrew). */
const mostlyRtl = (text: string) => {
  const letters = [...text].filter((c) => LETTER.test(c));
  const rtl = letters.filter((c) => RTL_CHAR.test(c)).length;
  return rtl > letters.length - rtl;
};

/** The direction an item's own letters run, or null for spaces and marks. */
const itemDir = (item: TextItem) => {
  if (RTL_CHAR.test(item.str)) {
    return "rtl";
  }
  return LTR_CHAR.test(item.str) ? "ltr" : null;
};

/**
 * Items sorted along the line (left to right, or right to left in an
 * Arabic line) read correctly except where a run goes the other way: an
 * Arabic phrase in an English line, an English name or a year in an Arabic
 * one. Those runs are drawn backwards, so each is turned around.
 */
const inReadingOrder = (sorted: TextItem[], rtl: boolean) => {
  const other = rtl ? "ltr" : "rtl";
  const out: TextItem[] = [];
  let run: TextItem[] = [];
  let pending: TextItem[] = [];
  const flush = () => {
    out.push(...run.reverse(), ...pending);
    run = [];
    pending = [];
  };
  for (const item of sorted) {
    const dir = itemDir(item);
    if (dir === other) {
      // Spaces between two pieces of the same run belong to it.
      run.push(...pending, item);
      pending = [];
    } else if (dir === null && run.length > 0) {
      pending.push(item);
    } else {
      flush();
      out.push(item);
    }
  }
  flush();
  return out;
};

/**
 * An item cleaned: presentation forms (ﺼ, ﹰ) back to letters and marks;
 * control characters (glyphs the PDF never mapped to text) gone; a mark
 * written ahead of its letter (a cluster in drawing order) after it. Null
 * for what the reader doesn't see.
 */
const cleanItem = (item: TextItem): TextItem | null => {
  const str = item.str
    .normalize("NFKC")
    .replace(CONTROL, "")
    .replace(MARK_FIRST, "$1$3$2");
  const bare = str.trim();
  if (bare === "") {
    // A space with no width is not a space the reader sees.
    const seen = str !== "" && item.width >= Math.max(item.height, 4) * 0.1;
    return seen ? { ...item, str: " " } : null;
  }
  // A sign with no width, letter or mark is an unmapped mark ("*").
  if (item.width === 0 && !LETTER_OR_MARK.test(bare)) {
    return null;
  }
  return { ...item, str: MARK.test(bare) ? bare : str };
};

/**
 * A diacritic drawn on its own sits at the start of its letter: it joins
 * the letter whose edge is nearest, on the same line.
 */
const attachMark = (mark: TextItem, bases: TextItem[]) => {
  let best: TextItem | null = null;
  for (const b of bases) {
    const sameLine = Math.abs(b.y - mark.y) < Math.max(b.height, 4);
    const nearer =
      best === null || Math.abs(b.x - mark.x) < Math.abs(best.x - mark.x);
    if (b.str.trim() !== "" && sameLine && nearer) {
      best = b;
    }
  }
  if (best) {
    best.str = `${best.str}${mark.str}`;
  }
};

/** Items grouped by their baseline, top of the page first. */
const rowsOf = (items: TextItem[]) => {
  const rows: { items: TextItem[]; y: number }[] = [];
  for (const item of items.toSorted((a, b) => b.y - a.y)) {
    const tolerance = Math.max(item.height, 4) * 0.5;
    const row = rows.find((r) => Math.abs(r.y - item.y) <= tolerance);
    if (row) {
      row.items.push(item);
    } else {
      rows.push({ items: [item], y: item.y });
    }
  }
  return rows;
};

/**
 * The space before an item: none, one where the PDF left a gap wider than
 * a fifth of the type without drawing it, or two em spaces for a gap of
 * more than two ems (the halves of a classical Arabic line, a tab).
 */
const spaceBefore = (
  item: TextItem,
  last: Run | undefined,
  edge: number | null,
  rtl: boolean,
  size: number
) => {
  if (
    last === undefined ||
    edge === null ||
    SPACE_EDGE.test(last.text.slice(-1)) ||
    SPACE_EDGE.test(item.str.slice(0, 1))
  ) {
    return "";
  }
  const gap = rtl ? edge - (item.x + item.width) : item.x - edge;
  if (gap <= size * 0.2) {
    return "";
  }
  return gap > size * 2 ? EM_SPACE.repeat(2) : " ";
};

/** One row of items as a line of runs, spaces put where the PDF left gaps. */
const lineOf = (items: TextItem[], y: number): Line => {
  const rtl = mostlyRtl(items.map((i) => i.str).join(""));
  const ordered = inReadingOrder(
    items.toSorted((a, b) => (rtl ? b.x - a.x : a.x - b.x)),
    rtl
  );
  const size = median(ordered.map((i) => i.height)) || 12;
  const runs: Run[] = [];
  let halves = false;
  let edge: number | null = null;
  for (const item of ordered) {
    const last = runs.at(-1);
    const space = spaceBefore(item, last, edge, rtl, size);
    halves ||= space.length > 1;
    const text = `${space}${item.str}`;
    const bold = item.bold === true;
    const italic = item.italic === true;
    if (last && last.bold === bold && last.italic === italic) {
      last.text += text;
    } else {
      runs.push({ bold, italic, text });
    }
    if (item.str.trim() !== "" || edge === null) {
      edge = rtl ? item.x : item.x + item.width;
    }
  }
  const left = Math.min(...items.map((i) => i.x));
  const right = Math.max(...items.map((i) => i.x + i.width));
  return { halves, left, right, rtl, runs, size, y };
};

/** Items into lines by their baseline; marks join the letter under them. */
const linesOf = (items: TextItem[]): Line[] => {
  const bases: TextItem[] = [];
  const marks: TextItem[] = [];
  for (const raw of items) {
    const item = cleanItem(raw);
    if (item) {
      (MARK.test(item.str) ? marks : bases).push(item);
    }
  }
  for (const mark of marks) {
    attachMark(mark, bases);
  }
  return rowsOf(bases).map((row) => lineOf(row.items, row.y));
};

const textOf = (line: Line) =>
  line.runs
    .map((r) => r.text)
    .join("")
    .trim();

const htmlOf = (line: Line, heading: boolean) =>
  line.runs
    .map((r) => {
      // Spaces at a run's edges stay outside its <em> and <strong>.
      const inner = r.text.trim();
      const before = inner ? r.text.slice(0, r.text.indexOf(inner)) : r.text;
      const after = inner
        ? r.text.slice(r.text.indexOf(inner) + inner.length)
        : "";
      let html = escapeHtml(inner);
      if (r.italic && inner) {
        html = `<em>${html}</em>`;
      }
      // A heading is set in its own weight, never bold (the brand book).
      if (r.bold && !heading && inner) {
        html = `<strong>${html}</strong>`;
      }
      return `${before}${html}${after}`;
    })
    .join("")
    .trim();

/** The room before and after a line, in its own reading direction. */
const sidesOf = (line: Line, { end, start }: Column) =>
  line.rtl
    ? [end - line.right, line.left - start]
    : [line.left - start, end - line.right];

const isCentered = (line: Line, column: Column) => {
  const [before = 0, after = 0] = sidesOf(line, column);
  return before > line.size && Math.abs(before - after) < line.size;
};

/**
 * Whether the page wrapped this line (so it joins the next) rather than the
 * writer breaking it: the next line's first word would not have fit in the
 * room left at the end of this one.
 */
const wraps = (line: Line, next: Line, column: Column) => {
  if (column.narrow || line.halves) {
    return false;
  }
  const [before = 0, after = 0] = sidesOf(line, column);
  // Centered lines (both this and the next) have room on both sides.
  const centered = isCentered(line, column) && isCentered(next, column);
  const room = centered ? before + after : after;
  const firstWord = textOf(next).split(SPACES)[0] ?? "";
  const perChar =
    (line.right - line.left) / Math.max([...textOf(line)].length, 1);
  // Letters differ in width (w against i), so a word is given a third
  // more than the line's average letters: a verse line rarely ends that
  // close to the margin.
  return room < ([...firstWord].length + 1) * perChar * 1.3;
};

/** Where a page's text column starts and ends. */
const columnOf = ({ lines, width }: PageLines, body: number): Column => {
  const bodyLines = lines.filter((l) => Math.abs(l.size - body) < body * 0.2);
  const measured = bodyLines.length > 0 ? bodyLines : lines;
  let start = Math.min(...measured.map((l) => l.left));
  let end = Math.max(...measured.map((l) => l.right));
  if (width === undefined) {
    return { end, narrow: false, start };
  }
  // Pages keep the same margin on both sides: a column of short lines
  // (verse) still ends where the page's text could.
  end = Math.max(end, width - start);
  start = Math.min(start, width - end);
  // Text within three fifths of the page's width never reached a margin.
  return { end, narrow: end - start < width * 0.6, start };
};

interface Placing {
  body: number;
  column: Column;
  /** The space between body lines on this page. */
  leading: number;
}

/** Whether a line starts a new block after the previous one on its page. */
const startsBlock = (
  line: Line,
  previous: Line,
  current: Block,
  indent: number,
  { body, leading }: Placing
) => {
  const heading = line.size >= body * 1.25;
  const gap = previous.y - line.y;
  // In prose (a block that has wrapped), an indented first line starts a
  // paragraph; in verse an indented line is only an indent.
  const prose = !current.heading && current.joins.includes(true);
  return (
    heading !== current.heading ||
    gap > leading * 1.35 ||
    (current.heading && heading && gap > line.size * 1.6) ||
    (prose && indent > line.size * 1.5)
  );
};

/**
 * How a line goes on from the block before it: joined to its last line
 * (true), on a line of its own (false), or null when it starts a block.
 */
const joinsBlock = (
  line: Line,
  previous: Line | null,
  current: Block,
  indent: number,
  placing: Placing
) => {
  if (previous) {
    return startsBlock(line, previous, current, indent, placing)
      ? null
      : wraps(previous, line, placing.column);
  }
  // A paragraph that runs over the page goes on where it stopped.
  const heading = line.size >= placing.body * 1.25;
  const last = current.lines.at(-1);
  if (current.heading || heading || !last) {
    return null;
  }
  return wraps(last, line, placing.column) ? true : null;
};

/** One page's lines added to the blocks so far. */
const addPage = (blocks: Block[], page: PageLines, body: number) => {
  const column = columnOf(page, body);
  const { lines } = page;
  const gaps = lines.slice(1).map((l, i) => (lines[i]?.y ?? 0) - l.y);
  const leading = median(gaps.filter((g) => g < body * 3)) || body * 1.2;
  const placing = { body, column, leading };
  let previous: Line | null = null;
  for (const line of lines) {
    const heading = line.size >= body * 1.25;
    const current = blocks.at(-1);
    const indent = line.rtl
      ? column.end - line.right
      : line.left - column.start;
    const joins = current
      ? joinsBlock(line, previous, current, indent, placing)
      : null;
    if (current && joins !== null) {
      current.joins.push(joins);
      current.lines.push(line);
      current.indents.push(indent);
    } else {
      blocks.push({ heading, indents: [indent], joins: [], lines: [line] });
    }
    previous = line;
  }
};

const blocksOf = (pages: PageLines[]): Block[] => {
  const body = median(pages.flatMap((p) => p.lines.map((l) => l.size))) || 12;
  const blocks: Block[] = [];
  for (const page of pages) {
    addPage(blocks, page, body);
  }
  return blocks;
};

/**
 * Whether a block's lines keep their indents: verse does (prose's first
 * line indent starts its paragraph), unless the poem is centered, whose
 * lines start anywhere.
 */
const keepsIndents = (block: Block) => {
  if (block.heading || block.joins.includes(true)) {
    return false;
  }
  const centers = block.lines.map((l) => (l.left + l.right) / 2);
  const lefts = block.lines.map((l) => l.left);
  const size = block.lines[0]?.size ?? 12;
  const centered =
    block.lines.length > 1 &&
    Math.max(...centers) - Math.min(...centers) < size &&
    Math.max(...lefts) - Math.min(...lefts) > size * 2;
  return !centered;
};

const blockHtml = (block: Block) => {
  const indents = keepsIndents(block);
  let html = "";
  block.lines.forEach((line, index) => {
    // An em space for each em of indent.
    const ems = indents
      ? Math.round((block.indents[index] ?? 0) / line.size)
      : 0;
    const text = `${EM_SPACE.repeat(Math.max(ems, 0))}${htmlOf(line, block.heading)}`;
    const previous = block.lines[index - 1];
    if (previous === undefined) {
      html = text;
    } else if (!block.joins[index - 1]) {
      html = `${html}<br>${text}`;
    } else if (
      HYPHEN_END.test(textOf(previous)) &&
      LOWER_START.test(textOf(line))
    ) {
      // A word the page broke with a hyphen is one word again.
      html = `${html.replace(HYPHEN_TAIL, "$1")}${text}`;
    } else {
      html = `${html} ${text}`;
    }
  });
  const rtl = block.lines.filter((l) => l.rtl).length > block.lines.length / 2;
  const tag = block.heading ? "h2" : "p";
  return `<${tag} dir="${rtl ? "rtl" : "ltr"}">${html}</${tag}>`;
};

/** A line's text with its numbers blanked, to match running heads. */
const shapeOf = (line: Line) => textOf(line).replace(DIGITS, "#");

/**
 * Drops what the page adds, not the writer: a page number alone at the
 * top or bottom, and a running head or foot ("Rahman 2") that repeats at
 * the same edge of other pages with only its number changing.
 */
const withoutPageFurniture = (pages: Line[][]) => {
  const edges = (pick: (lines: Line[]) => Line | undefined) => {
    const counts = new Map<string, number>();
    for (const lines of pages) {
      const line = lines.length > 1 ? pick(lines) : undefined;
      if (line) {
        counts.set(shapeOf(line), (counts.get(shapeOf(line)) ?? 0) + 1);
      }
    }
    return counts;
  };
  const tops = edges((l) => l[0]);
  const bottoms = edges((l) => l.at(-1));
  return pages.map((lines) =>
    lines.filter((line, index) => {
      const top = index === 0;
      const bottom = index === lines.length - 1;
      if (!(top || bottom) || lines.length < 2) {
        return true;
      }
      if (PAGE_NUMBER.test(textOf(line))) {
        return false;
      }
      const repeats = (top ? tops : bottoms).get(shapeOf(line)) ?? 0;
      return !(pages.length > 1 && repeats > 1 && HAS_DIGIT.test(textOf(line)));
    })
  );
};

/** The pages' text items as HTML: paragraphs and headings, with <br> lines. */
export const layoutPages = (pages: TextPage[]) => {
  const cleaned = withoutPageFurniture(
    pages.map(({ items }) => linesOf(items).filter((l) => textOf(l) !== ""))
  );
  const laid = pages.map(({ width }, index) => ({
    lines: cleaned[index] ?? [],
    width,
  }));
  return blocksOf(laid.filter((p) => p.lines.length > 0))
    .map(blockHtml)
    .join("");
};

/** What PDF.js gives for one run of text (a TextItem in its own terms). */
interface PdfItem {
  dir?: string;
  height?: number;
  str: string;
  transform: number[];
  width: number;
}

/**
 * A PDF.js item as a TextItem. The font's own name (when PDF.js was asked
 * for it) says italic or bold; a slant in the drawing says italic too.
 */
export const textItem = (item: PdfItem, fontName = ""): TextItem => {
  const [a = 0, , c = 0, d = 0, x = 0, y = 0] = item.transform;
  return {
    bold: BOLD_FACE.test(fontName),
    dir: item.dir,
    height: item.height || Math.abs(d) || Math.abs(a),
    italic: ITALIC_FACE.test(fontName) || Math.abs(c) > Math.abs(d) * 0.05,
    str: item.str,
    width: item.width,
    x,
    y,
  };
};

/**
 * Text without its tags, by a scan rather than a pattern, so a file's text
 * can't make it slow (CodeQL js/polynomial-redos).
 */
const textOfHtml = (html: string) => {
  let out = "";
  let inTag = false;
  for (const char of html) {
    if (char === "<") {
      inTag = true;
    } else if (char === ">") {
      inTag = false;
    } else if (!inTag) {
      out += char;
    }
  }
  return out;
};

/** A block's verse indents as em spaces: a tab, or every four spaces, one em. */
const indentsOf = (inner: string) =>
  inner.replace(
    LEADING,
    (_, br: string, space: string) =>
      `${br}${EM_SPACE.repeat(space.includes("\t") ? space.length : Math.round(space.length / 4))}`
  );

/** The next block element (as mammoth writes them, never nested) at or after `from`. */
const nextBlock = (html: string, from: number) => {
  let best: { end: number; inner: string; start: number; tag: string } | null =
    null;
  for (const tag of BLOCK_TAGS) {
    const start = html.indexOf(`<${tag}>`, from);
    if (start < 0 || (best && start >= best.start)) {
      continue;
    }
    const open = start + tag.length + 2;
    const close = html.indexOf(`</${tag}>`, open);
    if (close >= 0) {
      best = {
        end: close + tag.length + 3,
        inner: html.slice(open, close),
        start,
        tag,
      };
    }
  }
  return best;
};

/**
 * Word's paragraphs with their direction (Arabic right to left, by most
 * of their letters) and their verse indents kept.
 */
export const withDirection = (html: string) => {
  let out = "";
  let from = 0;
  for (
    let block = nextBlock(html, from);
    block;
    block = nextBlock(html, from)
  ) {
    const dir = mostlyRtl(textOfHtml(block.inner)) ? "rtl" : "ltr";
    out += `${html.slice(from, block.start)}<${block.tag} dir="${dir}">${indentsOf(block.inner)}</${block.tag}>`;
    from = block.end;
  }
  return out + html.slice(from);
};
