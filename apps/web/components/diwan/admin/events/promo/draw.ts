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
  /** One line: the date and time. */
  date: string;
  /** A list item of the event's own, for its carousel slide. */
  item?: string;
  summary: string;
  title: string;
  /** The address shown and in the QR. */
  url: string;
  venue: string;
}

export interface Layout {
  height: number;
  /** The image's share of the height (portrait) or width (landscape). */
  imageShare: number;
  margin: number;
  qr: boolean;
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
  lang: Lang
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
  text: string,
  art: Art,
  top: number,
  bottom: number
) => {
  if (!text || frame.wide) {
    return;
  }
  const { ctx } = pen;
  const size = frame.unit * 3.8;
  const lineHeight = size * 1.36;
  ctx.fillStyle = COLORS.ink;
  ctx.font = `400 ${size}px ${art.faces.serif}`;
  const fits = Math.max(0, Math.floor((bottom - top) / lineHeight));
  setLines(
    pen,
    wrap(ctx, text, pen.end - pen.start).slice(0, fits),
    top,
    lineHeight
  );
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
  if (layout.qr && !frame.wide) {
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
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, layout.width, layout.height);
  const frame = placeImage(ctx, layout, art, lang);
  const pen: Pen = { ctx, end: frame.end, lang, start: frame.start };
  const titleTop = placeLockup(ctx, frame, art, lang);
  const below = placeHeading(pen, frame, content, art, titleTop);
  const bottom = layout.height - layout.safeBottom - layout.margin;
  const qrSize = layout.qr && !frame.wide ? frame.unit * 20 : 0;
  placeBody(
    pen,
    frame,
    content.item ?? content.summary,
    art,
    below + frame.unit * 4,
    bottom - qrSize - frame.unit * 4
  );
  placeFoot(pen, frame, layout, content, art, bottom, qrSize);
};
