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

export interface Art {
  faces: Faces;
  image: (CanvasImageSource & { height: number; width: number }) | null;
  lockup: CanvasImageSource & { height: number; width: number };
}

const SCHEME = /^https:\/\//u;

interface Frame {
  end: number;
  start: number;
  top: number;
  unit: number;
  wide: boolean;
}

/** The image: the top of a portrait, the far side of the wide preview. */
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
  if (!art.image) {
    if (number && !wide) {
      // A numbered card: the work's number, large, on stone.
      const ih = h * layout.imageShare;
      ctx.fillStyle = COLORS.stone;
      ctx.fillRect(0, 0, w, ih);
      ctx.fillStyle = COLORS.ink;
      ctx.font = `300 ${ih * 0.6}px ${art.faces.sans}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.direction = "ltr";
      ctx.fillText(number, w / 2, ih / 2);
      ctx.textBaseline = "alphabetic";
      return { ...frame, top: Math.max(frame.top, ih + m) };
    }
    return frame;
  }
  if (wide) {
    const iw = w * layout.imageShare;
    cover(ctx, art.image, lang === "ar" ? 0 : w - iw, 0, iw, h);
    return lang === "ar"
      ? { ...frame, start: iw + m }
      : { ...frame, end: w - iw - m };
  }
  const ih = h * layout.imageShare;
  cover(ctx, art.image, 0, 0, w, ih);
  return { ...frame, top: Math.max(frame.top, ih + m) };
};

/** The lockup on the reading side; returns where the title starts. */
const placeLockup = (
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  art: Art,
  lang: Lang
) => {
  const height = frame.unit * (frame.wide ? 9 : 7);
  const width = (art.lockup.width / art.lockup.height) * height;
  const x = lang === "ar" ? frame.end - width : frame.start;
  ctx.drawImage(art.lockup, x, frame.top, width, height);
  return frame.top + height + frame.unit * 6;
};

/** The title (Light in English, Regular in Arabic), then the date and place. */
const placeHeading = (
  pen: Pen,
  frame: Frame,
  content: Content,
  art: Art,
  top: number
) => {
  const { ctx, lang } = pen;
  const width = pen.end - pen.start;
  const titleSize = frame.unit * (frame.wide ? 9 : 8.5);
  ctx.fillStyle = COLORS.ink;
  ctx.font = `${lang === "ar" ? 400 : 300} ${titleSize}px ${art.faces.sans}`;
  ctx.textBaseline = "top";
  const y = setLines(
    pen,
    wrap(ctx, content.title, width).slice(0, 3),
    top,
    titleSize * 1.12
  );
  const metaSize = frame.unit * (frame.wide ? 3.6 : 3.2);
  ctx.fillStyle = COLORS.ash;
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
  ctx.fillStyle = COLORS.ink;
  ctx.font = `400 ${size}px ${art.faces.serif}`;
  const fits = Math.max(0, Math.floor((bottom - top) / lineHeight));
  const width = pen.end - pen.start;
  const lines = Array.isArray(text)
    ? text.flatMap((row) => wrap(ctx, row, width))
    : wrap(ctx, text, width);
  setLines(pen, lines.slice(0, fits), top, lineHeight);
};

/** The address, and the QR at the far end (never on Telegram's image). */
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
  ctx.fillStyle = COLORS.ink;
  ctx.font = `500 ${frame.unit * (frame.wide ? 3.4 : 3)}px ${art.faces.sans}`;
  ctx.direction = "ltr";
  ctx.textAlign = lang === "ar" ? "right" : "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(
    content.url.replace(SCHEME, ""),
    lang === "ar" ? pen.end : pen.start,
    bottom
  );
  ctx.textBaseline = "alphabetic";
  if (layout.qr && (layout.qrWide || !frame.wide)) {
    drawQr(
      ctx,
      content.url,
      lang === "ar" ? pen.start : pen.end - qrSize,
      bottom - qrSize,
      qrSize
    );
  }
};

/**
 * One design for every size: the image, the lockup, the title, the date
 * and place, the summary (or the slide's item), and the address with its
 * QR. Portrait formats stack them; the wide link preview sets the image
 * on the far side.
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
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, layout.width, layout.height);
  const frame = placeImage(ctx, layout, art, lang, content.number);
  const pen: Pen = { ctx, end: frame.end, lang, start: frame.start };
  const titleTop = placeLockup(ctx, frame, art, lang);
  const below = placeHeading(pen, frame, content, art, titleTop);
  const bottom = layout.height - layout.safeBottom - layout.margin;
  const qrSize = layout.qr && !frame.wide ? frame.unit * 20 : 0;
  placeBody(
    pen,
    frame,
    content.lines ?? content.item ?? content.summary,
    art,
    below + frame.unit * 4,
    bottom - qrSize - frame.unit * 4
  );
  placeFoot(pen, frame, layout, content, art, bottom, qrSize);
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

/** A sign: the lockup, a large heading, a line of text, a QR, logos. */
export interface Sign {
  heading: string;
  /** Logos in a row at the foot (the co-sponsors on the thank-you card). */
  logos?: (CanvasImageSource & { height: number; width: number })[];
  /** The address in the QR, shown under it. */
  qr?: string;
  text?: string;
}

/**
 * The door signs, the table tents and the thank-you card: one design, on
 * paper, the heading Light and large on the reading side.
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
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, w, h);
  const unit = Math.min(w, h) / 100;
  const frame: Frame = { end: w - m, start: m, top: m, unit, wide: w > h };
  const pen: Pen = { ctx, end: frame.end, lang, start: frame.start };
  const top = placeLockup(ctx, frame, art, lang);
  const size = unit * (frame.wide ? 11 : 12);
  ctx.fillStyle = COLORS.ink;
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
    const q = unit * 26;
    drawQr(
      ctx,
      sign.qr,
      lang === "ar" ? pen.start : pen.end - q,
      bottom - q,
      q
    );
    ctx.fillStyle = COLORS.ink;
    ctx.font = `500 ${unit * 3.2}px ${art.faces.sans}`;
    ctx.direction = "ltr";
    ctx.textAlign = lang === "ar" ? "right" : "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(
      sign.qr.replace(SCHEME, ""),
      lang === "ar" ? pen.end : pen.start,
      bottom
    );
  }
  if (sign.logos?.length) {
    const lh = unit * 8;
    let x = pen.start;
    for (const logo of sign.logos) {
      const lw = (logo.width / logo.height) * lh;
      if (x + lw > pen.end) {
        break;
      }
      ctx.drawImage(logo, x, bottom - lh, lw, lh);
      x += lw + unit * 5;
    }
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

/** The printed program: the event, then each work with its facts and line. */
export interface Program {
  date: string;
  items: { facts: string; line: string; title: string }[];
  title: string;
  venue: string;
}

export const drawProgram = (
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  program: Program,
  art: Art,
  lang: Lang
) => {
  const { height: h, margin: m, width: w } = layout;
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(0, 0, w, h);
  const unit = Math.min(w, h) / 100;
  const frame: Frame = { end: w - m, start: m, top: m, unit, wide: false };
  const pen: Pen = { ctx, end: frame.end, lang, start: frame.start };
  const top = placeLockup(ctx, frame, art, lang);
  let y = placeHeading(
    pen,
    frame,
    {
      date: program.date,
      summary: "",
      title: program.title,
      url: "",
      venue: program.venue,
    },
    art,
    top
  );
  const width = pen.end - pen.start;
  for (const [i, item] of program.items.entries()) {
    y += unit * 5;
    ctx.strokeStyle = COLORS.stone;
    ctx.lineWidth = Math.max(1, unit / 6);
    ctx.beginPath();
    ctx.moveTo(pen.start, y - unit * 2);
    ctx.lineTo(pen.end, y - unit * 2);
    ctx.stroke();
    ctx.fillStyle = COLORS.ink;
    ctx.font = `500 ${unit * 4.2}px ${art.faces.sans}`;
    y = setLines(
      pen,
      wrap(ctx, `${i + 1}. ${item.title}`, width),
      y,
      unit * 5.4
    );
    ctx.fillStyle = COLORS.ash;
    ctx.font = `400 ${unit * 3.2}px ${art.faces.sans}`;
    if (item.facts) {
      y = setLines(pen, wrap(ctx, item.facts, width), y + unit, unit * 4.4);
    }
    ctx.fillStyle = COLORS.ink;
    ctx.font = `400 ${unit * 3.8}px ${art.faces.serif}`;
    if (item.line) {
      y = setLines(pen, wrap(ctx, item.line, width), y + unit, unit * 5);
    }
    if (y > h - m) {
      break;
    }
  }
};
