import qrcode from "qrcode-generator";

/**
 * Drawing the promo kit (decisions.md, Events: a promo kit on every event)
 * in the browser, where Arabic is shaped and set right to left: the brand's
 * colors (SAL-MED-02; tokens.json), the lockup on the side the language
 * reads from, a Light headline in one color, hairlines and no boxes, and
 * the QR in ink on a white square.
 */

const COLORS = {
  ash: "#5c6568",
  ink: "#273236",
  paper: "#f5f2ee",
  stone: "#e2ddd6",
  white: "#ffffff",
} as const;

export type Lang = "ar" | "en";

export interface Faces {
  /** The headline and labels: Ubuntu, with its Arabic. */
  sans: string;
  /** Running text: Markazi Text, both languages. */
  serif: string;
}

export interface Content {
  /** One line: the date and time (or a work's credit, year and length). */
  date: string;
  /** A list item of the event's own, for its carousel slide. */
  item?: string;
  /** Rows set one per line in place of the summary ("Good to know"). */
  lines?: string[];
  /** A work with no still: its number, large, where the image would be. */
  number?: string;
  summary: string;
  title: string;
  /** The address shown and in the QR. */
  url: string;
  venue: string;
}

export interface Layout {
  /** A white margin around the whole piece (print: 10 mm). */
  border?: number;
  height: number;
  /** The image's share of the height (portrait) or width (landscape). */
  imageShare: number;
  /** The lockup on the picture's darkened top (never on Instagram). */
  logo?: boolean;
  margin: number;
  qr: boolean;
  /** The QR on a wide piece too (campus screens), not only portrait. */
  qrWide?: boolean;
  /** Kept clear of text at the top and bottom (a story's overlays). */
  safeBottom: number;
  safeTop: number;
  width: number;
}

const SPACE = /\s+/u;

/** Words into lines that fit `width`. */
const wrap = (ctx: CanvasRenderingContext2D, text: string, width: number) => {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(SPACE).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines;
};

/** The QR in ink on a white square, its quiet zone included. */
const drawQr = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number
) => {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 2;
  const cell = size / (n + quiet * 2);
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = COLORS.ink;
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (qr.isDark(r, c)) {
        ctx.fillRect(
          x + (c + quiet) * cell,
          y + (r + quiet) * cell,
          Math.ceil(cell),
          Math.ceil(cell)
        );
      }
    }
  }
};

/** The image, filling its box and cropped to it (object-fit: cover). */
const cover = (
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource & { height: number; width: number },
  x: number,
  y: number,
  w: number,
  h: number
) => {
  const scale = Math.max(w / image.width, h / image.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(
    image,
    (image.width - sw) / 2,
    (image.height - sh) / 2,
    sw,
    sh,
    x,
    y,
    w,
    h
  );
};

interface Pen {
  ctx: CanvasRenderingContext2D;
  end: number;
  lang: Lang;
  start: number;
}

/** Text set from the reading side: left in English, right in Arabic. */
const setLines = (pen: Pen, lines: string[], y: number, lineHeight: number) => {
  const { ctx, end, lang, start } = pen;
  ctx.direction = lang === "ar" ? "rtl" : "ltr";
  ctx.textAlign = lang === "ar" ? "right" : "left";
  const x = lang === "ar" ? end : start;
  lines.forEach((line, i) => {
    ctx.fillText(line, x, y + i * lineHeight);
  });
  return y + lines.length * lineHeight;
};

type Picture = CanvasImageSource & { height: number; width: number };

/** A line of partners: "Co-sponsored by" or "Thanks to", and who. */
export interface PartnerRow {
  items: { logo: Picture | null; name: string }[];
  label: string;
}

export interface Art {
  faces: Faces;
  image: Picture | null;
  /** The lockup on paper. */
  lockup: Picture;
  /** The lockup on ink (reversed). */
  lockupDark: Picture;
  /** The partners along the foot, in white (none on stories or inside slides). */
  partners?: PartnerRow[];
  /** The wordmark on ink, for a carousel's last slide. */
  wordmark?: Picture;
}

const SCHEME = /^https:\/\//u;

interface Frame {
  end: number;
  start: number;
  top: number;
  unit: number;
  wide: boolean;
}

/** An ink color at an opacity, for the image's fade and darkened top. */
const inkAt = (alpha: number) => `rgba(39, 50, 54, ${alpha})`;

/**
 * The image: the top of a portrait, the far side of a wide piece, fading
 * into ink at its foot (or its inner side), its top darkened for the
 * lockup. No words on the picture (decisions.md, Events: one look).
 */
const placeImage = (
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  art: Art,
  lang: Lang,
  number?: string
): Frame => {
  const { height: h, margin: m, width: w } = layout;
  const wide = w > h;
  const frame: Frame = {
    end: w - m,
    start: m,
    top: layout.safeTop + m,
    unit: Math.min(w, h) / 100,
    wide,
  };
  const logoRoom = layout.logo ? frame.unit * 7 + m : 0;
  if (!art.image) {
    if (number && !wide) {
      // A numbered card: the work's number, large, where a still would be.
      const ih = h * layout.imageShare;
      ctx.fillStyle = COLORS.ash;
      ctx.font = `300 ${ih * 0.6}px ${art.faces.sans}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.direction = "ltr";
      ctx.fillText(number, w / 2, ih / 2);
      ctx.textBaseline = "alphabetic";
      return { ...frame, top: Math.max(frame.top, ih + m) };
    }
    return { ...frame, top: frame.top + logoRoom };
  }
  if (wide) {
    const iw = w * layout.imageShare;
    const x = lang === "ar" ? 0 : w - iw;
    cover(ctx, art.image, x, 0, iw, h);
    // Into ink on the text's side.
    const fade = ctx.createLinearGradient(
      lang === "ar" ? iw : x,
      0,
      lang === "ar" ? iw * 0.55 : x + iw * 0.45,
      0
    );
    fade.addColorStop(0, inkAt(1));
    fade.addColorStop(1, inkAt(0));
    ctx.fillStyle = fade;
    ctx.fillRect(x, 0, iw, h);
    return lang === "ar"
      ? { ...frame, start: iw + m, top: frame.top + logoRoom }
      : { ...frame, end: w - iw - m, top: frame.top + logoRoom };
  }
  const ih = h * layout.imageShare;
  cover(ctx, art.image, 0, 0, w, ih);
  // The top darkened for the lockup; the foot fading into ink.
  const top = ctx.createLinearGradient(0, 0, 0, ih * 0.32);
  top.addColorStop(0, inkAt(layout.logo ? 0.65 : 0));
  top.addColorStop(1, inkAt(0));
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, ih * 0.32);
  const foot = ctx.createLinearGradient(0, ih * 0.55, 0, ih);
  foot.addColorStop(0, inkAt(0));
  foot.addColorStop(1, inkAt(1));
  ctx.fillStyle = foot;
  ctx.fillRect(0, ih * 0.55, w, ih * 0.45 + 1);
  return { ...frame, top: Math.max(frame.top, ih + m * 0.5) };
};

/** The lockup on the reading side, at the top; returns its foot. */
const placeLockup = (
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  lockup: Art["lockup"],
  lang: Lang,
  top: number
) => {
  const height = frame.unit * (frame.wide ? 9 : 7);
  const width = (lockup.width / lockup.height) * height;
  const x = lang === "ar" ? frame.end - width : frame.start;
  ctx.drawImage(lockup, x, top, width, height);
  return top + height + frame.unit * 6;
};

interface Colors {
  meta: string;
  text: string;
}

const ON_INK: Colors = { meta: COLORS.stone, text: COLORS.white };
const ON_PAPER: Colors = { meta: COLORS.ash, text: COLORS.ink };

/** The title (Light in English, Regular in Arabic), then the date and place. */
const placeHeading = (
  pen: Pen,
  frame: Frame,
  content: Content,
  art: Art,
  top: number,
  colors: Colors = ON_INK
) => {
  const { ctx, lang } = pen;
  const width = pen.end - pen.start;
  const titleSize = frame.unit * (frame.wide ? 9 : 8.5);
  ctx.fillStyle = colors.text;
  ctx.font = `${lang === "ar" ? 400 : 300} ${titleSize}px ${art.faces.sans}`;
  ctx.textBaseline = "top";
  const y = setLines(
    pen,
    wrap(ctx, content.title, width).slice(0, 3),
    top,
    titleSize * 1.12
  );
  const metaSize = frame.unit * (frame.wide ? 3.6 : 3.2);
  ctx.fillStyle = colors.meta;
  ctx.font = `500 ${metaSize}px ${art.faces.sans}`;
  return setLines(
    pen,
    [content.date, content.venue].filter(Boolean),
    y + frame.unit * 3,
    metaSize * 1.5
  );
};

/** The slide's item, or the summary, in Markazi Text, in the room left. */
const placeBody = (
  pen: Pen,
  frame: Frame,
  text: string | string[],
  art: Art,
  top: number,
  bottom: number
) => {
  if (text.length === 0 || frame.wide) {
    return;
  }
  const { ctx } = pen;
  const size = frame.unit * 3.8;
  const lineHeight = size * 1.36;
  ctx.fillStyle = COLORS.paper;
  ctx.font = `400 ${size}px ${art.faces.serif}`;
  const fits = Math.max(0, Math.floor((bottom - top) / lineHeight));
  const width = pen.end - pen.start;
  const lines = Array.isArray(text)
    ? text.flatMap((row) => wrap(ctx, row, width))
    : wrap(ctx, text, width);
  setLines(pen, lines.slice(0, fits), top, lineHeight);
};

const BREAKS = /(?<=[/.-])/u;

/** An address cut into lines no wider than `width` (a QR's label). */
const wrapAddress = (
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number
) => {
  const lines: string[] = [];
  let line = "";
  for (const part of text.split(BREAKS)) {
    const next = line + part;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = part;
    } else {
      line = next;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines;
};

/**
 * A QR with its label under it, never wider than the code: the label
 * wraps. Returns the label's height, so the code sits above it.
 */
const qrWithLabel = (
  ctx: CanvasRenderingContext2D,
  url: string,
  x: number,
  bottom: number,
  size: number,
  font: string,
  color: string,
  label?: string
) => {
  ctx.font = font;
  const lineHeight = Number.parseFloat(font.split(" ")[1] ?? "12") * 1.3;
  const lines = [
    ...(label ? wrap(ctx, label, size) : []),
    ...wrapAddress(ctx, url.replace(SCHEME, ""), size),
  ];
  const labelHeight = lines.length * lineHeight;
  drawQr(ctx, url, x, bottom - labelHeight - size, size);
  ctx.fillStyle = color;
  ctx.direction = "ltr";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  lines.forEach((line, i) => {
    ctx.fillText(line, x + size / 2, bottom - labelHeight + i * lineHeight);
  });
  ctx.textBaseline = "alphabetic";
  return labelHeight + size;
};

/** One line of partners, in reading order, logos or names, at one height. */
const setPartnerRow = (
  pen: Pen,
  items: PartnerRow["items"],
  widths: number[],
  at: { end: number; gap: number; lh: number; y: number }
) => {
  const { ctx, lang } = pen;
  const { end, gap, lh, y } = at;
  let x = lang === "ar" ? end : pen.start;
  items.forEach((item, i) => {
    const iw = widths[i] ?? 0;
    const left = lang === "ar" ? x - iw : x;
    if (left < pen.start - 1 || left + iw > end + 1) {
      return;
    }
    if (item.logo) {
      ctx.drawImage(item.logo, left, y - lh, iw, lh);
    } else {
      ctx.fillStyle = COLORS.white;
      ctx.direction = lang === "ar" ? "rtl" : "ltr";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(item.name, left, y - lh / 2);
    }
    x = lang === "ar" ? left - gap : left + iw + gap;
  });
};

/** The partners along the foot, white, at one height, under their line. */
const placePartners = (
  pen: Pen,
  frame: Frame,
  art: Art,
  bottom: number,
  end: number
) => {
  const rows = (art.partners ?? []).filter((r) => r.items.length > 0);
  if (rows.length === 0) {
    return bottom;
  }
  const { ctx, lang } = pen;
  const lh = frame.unit * (frame.wide ? 5 : 5.5);
  const labelSize = frame.unit * 2.4;
  const gap = frame.unit * 4;
  let y = bottom;
  for (const row of [...rows].reverse()) {
    // Logos left to right in reading order; a partner with no white logo
    // is named in words.
    ctx.font = `500 ${lh * 0.5}px ${art.faces.sans}`;
    const widths = row.items.map((item) =>
      item.logo
        ? (item.logo.width / item.logo.height) * lh
        : ctx.measureText(item.name).width
    );
    setPartnerRow(pen, row.items, widths, { end, gap, lh, y });
    y -= lh + frame.unit * 1.5;
    ctx.fillStyle = COLORS.stone;
    ctx.font = `500 ${labelSize}px ${art.faces.sans}`;
    ctx.direction = lang === "ar" ? "rtl" : "ltr";
    ctx.textAlign = lang === "ar" ? "right" : "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(row.label, lang === "ar" ? end : pen.start, y);
    y -= labelSize * 1.4 + frame.unit * 2;
  }
  ctx.textBaseline = "alphabetic";
  return y;
};

/**
 * The foot: the partners, then the address with its QR at the far end
 * (never on Telegram's image or the link preview). Returns the top of
 * what it set.
 */
const placeFoot = (
  pen: Pen,
  frame: Frame,
  layout: Layout,
  content: Content,
  art: Art,
  bottom: number,
  qrSize: number
) => {
  const { ctx, lang } = pen;
  const font = `500 ${frame.unit * (frame.wide ? 2.6 : 2.4)}px ${art.faces.sans}`;
  if (layout.qr && (layout.qrWide || !frame.wide)) {
    const used = qrWithLabel(
      ctx,
      content.url,
      lang === "ar" ? pen.start : pen.end - qrSize,
      bottom,
      qrSize,
      font,
      COLORS.paper
    );
    // The partners beside the code, on the reading side.
    const room = lang === "ar" ? pen.end : pen.end - qrSize - frame.unit * 4;
    const partnersPen =
      lang === "ar"
        ? { ...pen, start: pen.start + qrSize + frame.unit * 4 }
        : pen;
    const top = placePartners(partnersPen, frame, art, bottom, room);
    return Math.min(top, bottom - used);
  }
  ctx.fillStyle = COLORS.paper;
  ctx.font = font;
  ctx.direction = "ltr";
  ctx.textAlign = lang === "ar" ? "right" : "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(
    content.url.replace(SCHEME, ""),
    lang === "ar" ? pen.end : pen.start,
    bottom
  );
  ctx.textBaseline = "alphabetic";
  return placePartners(pen, frame, art, bottom - frame.unit * 5, pen.end);
};

/**
 * One design for every size (decisions.md, Events: one look): the image
 * at the top fading into ink, the lockup on its darkened top where the
 * piece carries it (never on Instagram), then on solid ink the title, the
 * date and place, the summary (or the slide's item), the partners in
 * white along the foot, and the address with its QR. The wide pieces set
 * the image on the far side.
 */
export const drawCard = (
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  content: Content,
  art: Art,
  lang: Lang
) => {
  if (layout.border) {
    framed(ctx, layout, (inner) => drawCard(ctx, inner, content, art, lang));
    return;
  }
  ctx.fillStyle = COLORS.ink;
  ctx.fillRect(0, 0, layout.width, layout.height);
  const frame = placeImage(ctx, layout, art, lang, content.number);
  const pen: Pen = { ctx, end: frame.end, lang, start: frame.start };
  if (layout.logo) {
    placeLockup(
      ctx,
      frame,
      art.lockupDark,
      lang,
      layout.safeTop + layout.margin
    );
  }
  const below = placeHeading(pen, frame, content, art, frame.top);
  const bottom = layout.height - layout.safeBottom - layout.margin;
  const qrSize =
    layout.qr && (layout.qrWide || !frame.wide) ? frame.unit * 18 : 0;
  const footTop = placeFoot(pen, frame, layout, content, art, bottom, qrSize);
  placeBody(
    pen,
    frame,
    content.lines ?? content.item ?? content.summary,
    art,
    below + frame.unit * 4,
    footTop - frame.unit * 4
  );
};

/** A carousel's last slide: the wordmark alone, the partners at the foot. */
export const drawWordmark = (
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  art: Art,
  lang: Lang
) => {
  const { height: h, margin: m, width: w } = layout;
  ctx.fillStyle = COLORS.ink;
  ctx.fillRect(0, 0, w, h);
  const unit = Math.min(w, h) / 100;
  const mark = art.wordmark ?? art.lockupDark;
  const mw = w * 0.56;
  const mh = (mark.height / mark.width) * mw;
  ctx.drawImage(mark, (w - mw) / 2, (h - mh) / 2, mw, mh);
  const frame: Frame = { end: w - m, start: m, top: m, unit, wide: false };
  placePartners({ ctx, end: w - m, lang, start: m }, frame, art, h - m, w - m);
};

/** A white margin around the piece; the piece drawn inside it. */
const framed = (
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  draw: (inner: Layout) => void
) => {
  const b = layout.border ?? 0;
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.save();
  ctx.translate(b, b);
  ctx.beginPath();
  ctx.rect(0, 0, layout.width - 2 * b, layout.height - 2 * b);
  ctx.clip();
  draw({
    ...layout,
    border: 0,
    height: layout.height - 2 * b,
    width: layout.width - 2 * b,
  });
  ctx.restore();
};

/** A sign: the lockup, a large heading, a line of text, a QR. */
export interface Sign {
  /** On ink, with the partners in white along the foot (the thank-you post). */
  dark?: boolean;
  heading: string;
  /** The address in the QR, shown under it. */
  qr?: string;
  text?: string;
}

/**
 * The door signs, the table tents and the thank-you post: one design, the
 * heading Light and large on the reading side; on paper, or on ink for the
 * thank-you post with the partners' white logos.
 */
export const drawSign = (
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  sign: Sign,
  art: Art,
  lang: Lang
) => {
  if (layout.border) {
    framed(ctx, layout, (inner) => drawSign(ctx, inner, sign, art, lang));
    return;
  }
  const { height: h, margin: m, width: w } = layout;
  const colors = sign.dark ? ON_INK : ON_PAPER;
  ctx.fillStyle = sign.dark ? COLORS.ink : COLORS.paper;
  ctx.fillRect(0, 0, w, h);
  const unit = Math.min(w, h) / 100;
  const frame: Frame = { end: w - m, start: m, top: m, unit, wide: w > h };
  const pen: Pen = { ctx, end: frame.end, lang, start: frame.start };
  const top = placeLockup(
    ctx,
    frame,
    sign.dark ? art.lockupDark : art.lockup,
    lang,
    m
  );
  const size = unit * (frame.wide ? 11 : 12);
  ctx.fillStyle = colors.text;
  ctx.font = `${lang === "ar" ? 400 : 300} ${size}px ${art.faces.sans}`;
  ctx.textBaseline = "top";
  let y = setLines(
    pen,
    wrap(ctx, sign.heading, pen.end - pen.start).slice(0, 3),
    top + unit * 4,
    size * 1.12
  );
  if (sign.text) {
    const body = unit * 4.4;
    ctx.fillStyle = colors.text;
    ctx.font = `400 ${body}px ${art.faces.serif}`;
    y = setLines(
      pen,
      wrap(ctx, sign.text, pen.end - pen.start).slice(0, 6),
      y + unit * 4,
      body * 1.36
    );
  }
  const bottom = h - m;
  if (sign.qr) {
    const q = unit * 24;
    qrWithLabel(
      ctx,
      sign.qr,
      lang === "ar" ? pen.start : pen.end - q,
      bottom,
      q,
      `500 ${unit * 2.8}px ${art.faces.sans}`,
      colors.text
    );
  }
  if (sign.dark) {
    placePartners(pen, frame, art, bottom, pen.end);
  }
  ctx.textBaseline = "alphabetic";
};

/**
 * A table tent: folded A4, the sign on both halves, the top one turned so
 * it reads from the other side of the table.
 */
export const drawTent = (
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  sign: Sign,
  art: Art,
  lang: Lang
) => {
  const half: Layout = { ...layout, height: layout.height / 2 };
  ctx.save();
  ctx.translate(0, layout.height / 2);
  drawSign(ctx, half, sign, art, lang);
  ctx.restore();
  ctx.save();
  ctx.translate(layout.width, layout.height / 2);
  ctx.rotate(Math.PI);
  drawSign(ctx, half, sign, art, lang);
  ctx.restore();
  ctx.strokeStyle = COLORS.stone;
  ctx.lineWidth = Math.max(1, layout.width / 1000);
  ctx.beginPath();
  ctx.moveTo(0, layout.height / 2);
  ctx.lineTo(layout.width, layout.height / 2);
  ctx.stroke();
};

/**
 * The printed program (decisions.md, Events): one A4 sheet, both sides,
 * flipped on the long edge.
 */
export interface Program {
  date: string;
  /** "How was it?" and the event page's address, for the QR. */
  feedback: { label: string; url: string };
  items: {
    facts: string;
    line: string;
    still: Picture | null;
    title: string;
  }[];
  /** The run time, the content note and the Wellness Center, one line each. */
  notes: string[];
  /** The partners in words: "Co-sponsored by …", "Thanks to …". */
  partners: string[];
  title: string;
  /** The bottom 62 mm of the front: "Turn over: a note to …". */
  turnOver: string;
  venue: string;
}

/** The back: the discussion questions, and the note behind the tear. */
export interface ProgramBack {
  conversation: string;
  foldAndTear: string;
  note: string;
  questions: string[];
}

/** 62 mm of an A4 page's 297, the part below the tear line. */
const TEAR_SHARE = 62 / 297;

const ruled = (
  ctx: CanvasRenderingContext2D,
  pen: Pen,
  from: number,
  to: number,
  gap: number
) => {
  ctx.strokeStyle = COLORS.stone;
  ctx.lineWidth = Math.max(1, gap / 30);
  for (let y = from + gap; y <= to; y += gap) {
    ctx.beginPath();
    ctx.moveTo(pen.start, y);
    ctx.lineTo(pen.end, y);
    ctx.stroke();
  }
};

/** The front: the event, the works, the notes, "How was it?", the partners. */
export const drawProgramFront = (
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  program: Program,
  art: Art,
  lang: Lang
) => {
  if (layout.border) {
    framed(ctx, layout, (inner) =>
      drawProgramFront(ctx, inner, program, art, lang)
    );
    return;
  }
  const { height: h, margin: m, width: w } = layout;
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(0, 0, w, h);
  const unit = Math.min(w, h) / 100;
  const frame: Frame = { end: w - m, start: m, top: m, unit, wide: false };
  const pen: Pen = { ctx, end: frame.end, lang, start: frame.start };
  const top = placeLockup(ctx, frame, art.lockup, lang, m);
  let y = placeHeading(
    pen,
    { ...frame, unit: unit * 0.8 },
    {
      date: program.date,
      summary: "",
      title: program.title,
      url: "",
      venue: program.venue,
    },
    art,
    top,
    ON_PAPER
  );
  const tear = h - h * TEAR_SHARE;
  const qr = unit * 13;
  const footTop = tear - unit * 4 - qr - unit * 4;
  const thumb = unit * 9;
  for (const item of program.items) {
    y += unit * 2.2;
    if (y + thumb * 0.66 > footTop) {
      break;
    }
    const textStart = lang === "ar" ? pen.start : pen.start + thumb + unit * 3;
    const textEnd = lang === "ar" ? pen.end - thumb - unit * 3 : pen.end;
    if (item.still) {
      cover(
        ctx,
        item.still,
        lang === "ar" ? pen.end - thumb : pen.start,
        y,
        thumb,
        thumb * 0.66
      );
    }
    const textPen: Pen = { ...pen, end: textEnd, start: textStart };
    const width = textEnd - textStart;
    ctx.fillStyle = COLORS.ink;
    ctx.font = `500 ${unit * 2.8}px ${art.faces.sans}`;
    ctx.textBaseline = "top";
    let ty = setLines(textPen, wrap(ctx, item.title, width), y, unit * 3.4);
    ctx.fillStyle = COLORS.ash;
    ctx.font = `400 ${unit * 2.1}px ${art.faces.sans}`;
    if (item.facts) {
      ty = setLines(textPen, wrap(ctx, item.facts, width), ty, unit * 2.7);
    }
    ctx.fillStyle = COLORS.ink;
    ctx.font = `400 ${unit * 2.5}px ${art.faces.serif}`;
    if (item.line) {
      ty = setLines(
        textPen,
        wrap(ctx, item.line, width).slice(0, 2),
        ty,
        unit * 3
      );
    }
    y = Math.max(ty, y + thumb * 0.66);
  }
  // The notes and the partners in words, beside the "How was it?" code.
  const notesPen: Pen =
    lang === "ar"
      ? { ...pen, start: pen.start + qr + unit * 4 }
      : { ...pen, end: pen.end - qr - unit * 4 };
  ctx.fillStyle = COLORS.ink;
  ctx.font = `400 ${unit * 2.6}px ${art.faces.serif}`;
  ctx.textBaseline = "top";
  const notes = [...program.notes, ...program.partners].flatMap((line) =>
    wrap(ctx, line, notesPen.end - notesPen.start)
  );
  setLines(
    notesPen,
    notes.slice(0, 9),
    tear - unit * 4 - qr - unit * 4,
    unit * 3.3
  );
  qrWithLabel(
    ctx,
    program.feedback.url,
    lang === "ar" ? pen.start : pen.end - qr,
    tear - unit * 3,
    qr,
    `500 ${unit * 2}px ${art.faces.sans}`,
    COLORS.ink,
    program.feedback.label
  );
  // The bottom 62 mm hold only the line that turns the page.
  ctx.strokeStyle = COLORS.stone;
  ctx.lineWidth = Math.max(1, unit / 6);
  ctx.beginPath();
  ctx.moveTo(pen.start, tear);
  ctx.lineTo(pen.end, tear);
  ctx.stroke();
  ctx.fillStyle = COLORS.ink;
  ctx.font = `300 ${unit * 5}px ${art.faces.sans}`;
  ctx.direction = lang === "ar" ? "rtl" : "ltr";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(program.turnOver, w / 2, tear + (h - tear) / 2);
  ctx.textBaseline = "alphabetic";
};

/** The back: "For the conversation", then the note to tear off. */
export const drawProgramBack = (
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  back: ProgramBack,
  art: Art,
  lang: Lang
) => {
  if (layout.border) {
    framed(ctx, layout, (inner) =>
      drawProgramBack(ctx, inner, back, art, lang)
    );
    return;
  }
  const { height: h, margin: m, width: w } = layout;
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(0, 0, w, h);
  const unit = Math.min(w, h) / 100;
  const pen: Pen = { ctx, end: w - m, lang, start: m };
  const width = pen.end - pen.start;
  const tear = h - h * TEAR_SHARE;
  ctx.fillStyle = COLORS.ink;
  ctx.font = `${lang === "ar" ? 400 : 300} ${unit * 6}px ${art.faces.sans}`;
  ctx.textBaseline = "top";
  let y = setLines(pen, [back.conversation], m, unit * 7);
  const questions = back.questions.slice(0, 6);
  const room = tear - unit * 6 - y;
  const each = questions.length > 0 ? room / questions.length : room;
  for (const question of questions) {
    ctx.fillStyle = COLORS.ink;
    ctx.font = `400 ${unit * 3.2}px ${art.faces.serif}`;
    ctx.textBaseline = "top";
    const after = setLines(
      pen,
      wrap(ctx, question, width).slice(0, 3),
      y + unit * 3,
      unit * 4
    );
    ruled(ctx, pen, after, y + each - unit, unit * 6);
    y += each;
  }
  if (questions.length === 0) {
    ruled(ctx, pen, y, tear - unit * 6, unit * 6);
  }
  // The dashed tear line, and the note under it, unsigned.
  ctx.strokeStyle = COLORS.ash;
  ctx.lineWidth = Math.max(1, unit / 5);
  ctx.setLineDash([unit * 1.5, unit]);
  ctx.beginPath();
  ctx.moveTo(0, tear);
  ctx.lineTo(w, tear);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = COLORS.ash;
  ctx.font = `500 ${unit * 2}px ${art.faces.sans}`;
  ctx.textBaseline = "bottom";
  setLines(pen, [back.foldAndTear], tear - unit, unit * 2.4);
  ctx.fillStyle = COLORS.ink;
  ctx.font = `${lang === "ar" ? 400 : 300} ${unit * 4.4}px ${art.faces.sans}`;
  ctx.textBaseline = "top";
  const noteTop = setLines(pen, [back.note], tear + unit * 4, unit * 5.4);
  ruled(ctx, pen, noteTop, h - m, unit * 6);
  ctx.textBaseline = "alphabetic";
};
