"use client";

import { Button } from "@repo/brand/components/ui/button";
import { logos } from "@repo/brand/lib/logos";
import { siteUrl } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { type Client, events, unwrap } from "@/lib/data";
import { mediaUrl } from "@/lib/media";
import { uploadMedia } from "@/lib/storage";
import { DiwanSection, RowList } from "../../../page";
import type {
  Art,
  Content,
  Faces,
  Lang,
  Layout,
  PartnerRow,
  Sign,
} from "./draw";
import { goodToKnowLines, KIT_WORDS, type KitFacts } from "./words";

/** The drawing code, the QR and the PDF writer load only when a kit is built. */
type Tools = Awaited<ReturnType<typeof loadTools>>;
const loadTools = async () => {
  const [
    {
      drawCard,
      drawProgramBack,
      drawProgramFront,
      drawSign,
      drawTent,
      drawWordmark,
    },
    { PDFDocument },
    { accessSentence },
    { tagForPdfUa },
  ] = await Promise.all([
    import("./draw"),
    import("pdf-lib"),
    import("@repo/email/copy"),
    import("@/lib/pdf-ua"),
  ]);
  return {
    accessSentence,
    tagForPdfUa,
    drawCard,
    drawProgramBack,
    drawProgramFront,
    drawSign,
    drawTent,
    drawWordmark,
    PDFDocument,
  };
};

/**
 * The promo kit (decisions.md, Events): one button on the event's page in
 * the Diwan builds everything from the event's own fields, image and
 * Program, in English and Arabic, in one look (decided Nov 22–23, 2026):
 * the image at the top fading into ink, nothing written on it; the title,
 * date and place below on solid ink; the lockup on the picture's darkened
 * top on the poster, the A4 sheets, the Telegram image and the campus
 * screen, never on Instagram; the partners' white logos along the foot on
 * the poster, the Instagram cover, the Telegram image, the campus screen,
 * the thank-you post and the last slide. Every printed piece keeps a
 * 10 mm white margin. The files:
 * - the Instagram carousel: a cover, one card per work in the Program
 *   (its still, or its number when it has none), "Good to know" and the
 *   wordmark alone;
 * - the stories: the cover, one per work, "Tomorrow" and "Today" (text
 *   clear of the top 220 and bottom 400 pixels);
 * - the A3 poster and an A1 for easels, the A4 two-sided handout, and a
 *   1920 × 1080 version for campus screens;
 * - for an event with a Program, the A4 program, both sides, flipped on
 *   the long edge: the works, "How was it?", and on the back "For the
 *   conversation" and the note to tear off for the box at the door;
 * - the check-in table tent (folded A4); no "Join" on printed matter;
 * - the door signs: in progress, photos and the content note;
 * - the thank-you post, with the partners;
 * - the Telegram image, the link preview and the captions.
 * Each file downloads on its own. Media posts them; nothing is uploaded.
 */

export interface PromoEvent extends KitFacts {
  body_ar: string | null;
  body_en: string | null;
  discussion?: unknown;
  ends_at: string | null;
  format?: string | null;
  id: string;
  image_alt_ar?: string | null;
  image_alt_en?: string | null;
  image_path: string | null;
  slug: string;
  starts_at: string;
  summary_ar: string | null;
  summary_en: string | null;
  title_ar: string;
  title_en: string;
  venue_ar: string | null;
  venue_en: string | null;
}

interface KitFile {
  blob: Blob;
  name: string;
}

/** 200 dots per inch for print (100 for the A1, read from afar): mm to pixels. */
const mm = (n: number, dpi = 200) => Math.round((n * dpi) / 25.4);
const PT_PER_MM = 72 / 25.4;

/**
 * Every printed piece keeps a 10 mm white margin: the university's copiers
 * can't print to the edge, and nothing needs cutting.
 */
const print = (wmm: number, hmm: number, dpi = 200): Layout => ({
  border: mm(10, dpi),
  height: mm(hmm, dpi),
  imageShare: 0.42,
  logo: true,
  margin: mm(10, dpi),
  qr: true,
  safeBottom: 0,
  safeTop: 0,
  width: mm(wmm, dpi),
});

/** A poster: the type set 12 mm inside its white margin. */
const poster = (wmm: number, hmm: number, dpi = 200): Layout => ({
  ...print(wmm, hmm, dpi),
  margin: mm(12, dpi),
});

const LAYOUTS = {
  a1: poster(594, 841, 100),
  carousel: {
    height: 1350,
    imageShare: 0.42,
    margin: 80,
    qr: true,
    safeBottom: 0,
    safeTop: 0,
    width: 1080,
  },
  door: print(210, 297),
  handout: print(210, 297),
  poster: poster(297, 420),
  preview: {
    height: 630,
    imageShare: 0.45,
    logo: true,
    margin: 56,
    qr: false,
    safeBottom: 0,
    safeTop: 0,
    width: 1200,
  },
  program: print(210, 297),
  screen: {
    height: 1080,
    imageShare: 0.45,
    logo: true,
    margin: 80,
    qr: true,
    qrWide: true,
    safeBottom: 0,
    safeTop: 0,
    width: 1920,
  },
  story: {
    height: 1920,
    imageShare: 0.34,
    margin: 80,
    qr: true,
    safeBottom: 400,
    safeTop: 220,
    width: 1080,
  },
  telegram: {
    height: 1350,
    imageShare: 0.42,
    logo: true,
    margin: 80,
    qr: false,
    safeBottom: 0,
    safeTop: 0,
    width: 1080,
  },
  tent: print(297, 210),
  thanks: {
    height: 1350,
    imageShare: 0,
    margin: 80,
    qr: false,
    safeBottom: 0,
    safeTop: 0,
    width: 1080,
  },
} satisfies Record<string, Layout>;

const TAGS = /<[^>]+>/gu;
const SPACES = /\s+/gu;

const plain = (html: string | null) =>
  (html ?? "").replace(TAGS, " ").replace(SPACES, " ").trim();

/** The description's list items, one slide each. */
const listItems = (html: string | null) => {
  if (!html) {
    return [];
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  return [...doc.querySelectorAll("li")]
    .map((li) => (li.textContent ?? "").trim())
    .filter(Boolean);
};

const contentFor = (event: PromoEvent, lang: Lang): Content => ({
  date: `${formatLongDate(event.starts_at, lang)}, ${formatClock(event.starts_at, lang)}`,
  summary:
    (lang === "ar" ? event.summary_ar : event.summary_en) ??
    plain(lang === "ar" ? event.body_ar : event.body_en),
  title: lang === "ar" ? event.title_ar : event.title_en,
  url: siteUrl(lang, `/events/${event.slug}`),
  venue: (lang === "ar" ? event.venue_ar : event.venue_en) ?? "",
});

/** One language's caption: title, date and place, summary, address. */
const captionIn = (event: PromoEvent, lang: "ar" | "en") => {
  const c = contentFor(event, lang);
  return [
    c.title,
    [c.date, c.venue].filter(Boolean).join(" · "),
    c.summary,
    c.url,
  ]
    .filter(Boolean)
    .join("\n");
};

/** The captions: English, then Arabic (decisions.md, Events). */
const captions = (event: PromoEvent) =>
  `${captionIn(event, "en")}\n\n${captionIn(event, "ar")}`;

/**
 * The kit's images and PDFs go into the media library under the event,
 * with both captions, so they can be found, reused and rebuilt
 * (decisions.md, The site: "One media library").
 */
const saveToLibrary = async (
  client: Client,
  event: PromoEvent,
  files: readonly KitFile[]
) => {
  const caption_ar = captionIn(event, "ar").slice(0, 2200);
  const caption_en = captionIn(event, "en").slice(0, 2200);
  for (const file of files) {
    if (
      !(
        file.blob.type.startsWith("image/") ||
        file.blob.type === "application/pdf"
      )
    ) {
      continue;
    }
    // biome-ignore lint/performance/noAwaitInLoops: one file at a time
    const stored = await uploadMedia(
      client,
      `promo/${event.slug}`,
      new File([file.blob], file.name, { type: file.blob.type })
    );
    unwrap(
      await client
        .schema("api")
        .from("media_items")
        .update({
          caption_ar,
          caption_en,
          event_id: event.id,
          kind: file.blob.type === "application/pdf" ? "pdf" : "promo",
        })
        .eq("path", stored.path)
    );
  }
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/** The brand's faces as the page loaded them (next/font variables). */
const facesOf = async (): Promise<Faces> => {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  const faces = {
    sans: [v("--font-ubuntu"), v("--font-ubuntu-arabic"), "sans-serif"]
      .filter(Boolean)
      .join(", "),
    serif: [v("--font-markazi"), "serif"].filter(Boolean).join(", "),
  };
  await Promise.all(
    ["300", "400", "500"].map((w) =>
      document.fonts.load(`${w} 40px ${faces.sans}`, "Aا")
    )
  );
  await document.fonts.load(`400 40px ${faces.serif}`, "Aا");
  return faces;
};

const paint = (
  tools: Tools,
  layout: Layout,
  content: Content,
  art: Art,
  lang: Lang
) => {
  const canvas = document.createElement("canvas");
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("canvas");
  }
  tools.drawCard(ctx, layout, content, art, lang);
  return canvas;
};

const png = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("png"))),
      "image/png"
    );
  });

/** A PDF of one or more pages, each an image at its size in millimeters. */
const pdf = async (
  tools: Tools,
  pages: HTMLCanvasElement[],
  wmm: number,
  hmm: number
) => {
  const doc = await tools.PDFDocument.create();
  for (const canvas of pages) {
    // biome-ignore lint/performance/noAwaitInLoops: pages in order
    const image = await doc.embedPng(await (await png(canvas)).arrayBuffer());
    const page = doc.addPage([wmm * PT_PER_MM, hmm * PT_PER_MM]);
    page.drawImage(image, {
      height: page.getHeight(),
      width: page.getWidth(),
      x: 0,
      y: 0,
    });
  }
  const bytes = await doc.save();
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
};

const LANG_TAG = { ar: "AR", en: "EN" } as const;

interface Extras {
  /** The partners along the foot, by line, in white or in words. */
  partners: Record<Lang, PartnerRow[]>;
  /** The Program's works, with their stills (or none). */
  program: {
    item: events.ProgramItem;
    still: (CanvasImageSource & { height: number; width: number }) | null;
  }[];
}

/** A work's facts in one line: credit, year and length. */
const facts = (item: events.ProgramItem, lang: Lang) =>
  [
    item.credit,
    item.year ? String(item.year) : null,
    item.length_minutes ? KIT_WORDS[lang].minutes(item.length_minutes) : null,
  ]
    .filter(Boolean)
    .join(" · ");

const own = (
  item: events.ProgramItem,
  field: "award" | "line" | "title",
  lang: Lang
) =>
  (lang === "ar" ? item[`${field}_ar`] : item[`${field}_en`]) ||
  (field === "title" ? item.title_en || item.title_ar : "") ||
  "";

const paintSign = (
  tools: Tools,
  layout: Layout,
  sign: Sign,
  art: Art,
  lang: Lang,
  tent = false
) => {
  const canvas = document.createElement("canvas");
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("canvas");
  }
  (tent ? tools.drawTent : tools.drawSign)(ctx, layout, sign, art, lang);
  return canvas;
};

/** The discussion questions in one language. */
const questionsIn = (event: PromoEvent, lang: Lang) =>
  (Array.isArray(event.discussion) ? event.discussion : [])
    .map((q) => (q as { ar?: string; en?: string } | null)?.[lang] ?? "")
    .map((q) => q.trim())
    .filter(Boolean);

/** The A4 program's two sides, for an event with a Program. */
const paintProgram = (
  tools: Tools,
  event: PromoEvent,
  extras: Extras,
  art: Art,
  lang: Lang
) => {
  const layout = LAYOUTS.program;
  const words = KIT_WORDS[lang];
  const films = event.format === "screening";
  const sheet = () => {
    const canvas = document.createElement("canvas");
    canvas.width = layout.width;
    canvas.height = layout.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("canvas");
    }
    return { canvas, ctx };
  };
  const c = contentFor(event, lang);
  const minutes = extras.program.reduce(
    (sum, { item }) => sum + (item.length_minutes ?? 0),
    0
  );
  const note = lang === "ar" ? event.content_note_ar : event.content_note_en;
  const front = sheet();
  tools.drawProgramFront(
    front.ctx,
    layout,
    {
      date: c.date,
      feedback: { label: words.howWasIt, url: `${c.url}#feedback` },
      items: extras.program.map(({ item, still }) => ({
        facts: facts(item, lang),
        line: [own(item, "line", lang), own(item, "award", lang)]
          .filter(Boolean)
          .join(" "),
        still,
        title: own(item, "title", lang),
      })),
      notes: [
        minutes > 0 ? words.runTime(minutes) : "",
        note ? `${words.contentNote}: ${note}` : "",
        note ? words.wellness : "",
      ].filter(Boolean),
      partners: extras.partners[lang].map(
        (row) =>
          `${row.label}: ${new Intl.ListFormat(lang === "ar" ? "ar" : "en-US", {
            type: "conjunction",
          }).format(row.items.map((i) => i.name))}.`
      ),
      title: c.title,
      turnOver: words.turnOver(films),
      venue: c.venue,
    },
    art,
    lang
  );
  const back = sheet();
  tools.drawProgramBack(
    back.ctx,
    layout,
    {
      conversation: words.forConversation,
      foldAndTear: words.foldAndTear,
      note: words.noteTo(films),
      questions: questionsIn(event, lang),
    },
    art,
    lang
  );
  return [front.canvas, back.canvas];
};

/** Every file of the kit for one language. */
const filesFor = async (
  tools: Tools,
  event: PromoEvent,
  lang: Lang,
  art: Art,
  extras: Extras
): Promise<KitFile[]> => {
  const words = KIT_WORDS[lang];
  const c = contentFor(event, lang);
  const base = `${event.slug}-${LANG_TAG[lang]}`;
  const detail = {
    ...c,
    summary: plain(lang === "ar" ? event.body_ar : event.body_en) || c.summary,
  };
  // The partners go only on the pieces that carry them (decisions.md,
  // Events: one look); everywhere else, none.
  const bare: Art = { ...art, partners: undefined };
  const withPartners: Art = { ...art, partners: extras.partners[lang] };
  const noImage = { ...bare, image: null };
  const items = listItems(lang === "ar" ? event.body_ar : event.body_en);
  // A work's card: its still, or its number; the facts in the date's place.
  const works = extras.program.map(({ item, still }, i) => ({
    art: { ...bare, image: still },
    content: {
      ...c,
      date: facts(item, lang),
      number: still ? undefined : String(i + 1),
      summary: [own(item, "line", lang), own(item, "award", lang)]
        .filter(Boolean)
        .join(" "),
      title: own(item, "title", lang),
      venue: "",
    },
  }));
  const goodToKnow: Content = {
    ...c,
    lines: goodToKnowLines(event, lang, tools.accessSentence(event, lang)),
    title: words.goodToKnow,
  };
  const time = formatClock(event.starts_at, lang);
  const last = document.createElement("canvas");
  last.width = LAYOUTS.carousel.width;
  last.height = LAYOUTS.carousel.height;
  const lastCtx = last.getContext("2d");
  if (lastCtx) {
    tools.drawWordmark(lastCtx, LAYOUTS.carousel, withPartners, lang);
  }
  const slides = [
    paint(tools, LAYOUTS.carousel, c, withPartners, lang),
    ...works.map((w) => paint(tools, LAYOUTS.carousel, w.content, w.art, lang)),
    // Without a Program, a list in the description still gets its slides.
    ...(works.length === 0
      ? items.map((item) =>
          paint(tools, LAYOUTS.carousel, { ...c, item }, noImage, lang)
        )
      : []),
    paint(tools, LAYOUTS.carousel, goodToKnow, noImage, lang),
    last,
  ];
  const stories = [
    paint(tools, LAYOUTS.story, c, bare, lang),
    ...works.map((w) => paint(tools, LAYOUTS.story, w.content, w.art, lang)),
    paint(
      tools,
      LAYOUTS.story,
      { ...c, date: `${words.tomorrow} · ${time}` },
      bare,
      lang
    ),
    paint(
      tools,
      LAYOUTS.story,
      { ...c, date: `${words.today} · ${time}` },
      bare,
      lang
    ),
  ];
  const note = lang === "ar" ? event.content_note_ar : event.content_note_en;
  const doors: [string, Sign][] = [
    [
      "door-in-progress",
      { heading: words.inProgress, text: words.inProgressText },
    ],
    ...(event.no_photos
      ? []
      : ([
          ["door-photos", { heading: words.photos, text: words.photosText }],
        ] as [string, Sign][])),
    ...(note
      ? ([
          ["door-content-note", { heading: words.contentNote, text: note }],
        ] as [string, Sign][])
      : []),
  ];
  const program =
    extras.program.length > 0
      ? paintProgram(tools, event, extras, bare, lang)
      : null;
  const pngs = (list: HTMLCanvasElement[], name: string) =>
    Promise.all(
      list.map(async (canvas, i) => ({
        blob: await png(canvas),
        name: `${base}-${name}-${i + 1}.png`,
      }))
    );
  return [
    {
      blob: await pdf(
        tools,
        [paint(tools, LAYOUTS.poster, c, withPartners, lang)],
        297,
        420
      ),
      name: `${base}-poster-A3.pdf`,
    },
    {
      blob: await pdf(
        tools,
        [paint(tools, LAYOUTS.a1, c, withPartners, lang)],
        594,
        841
      ),
      name: `${base}-poster-A1.pdf`,
    },
    {
      blob: await pdf(
        tools,
        [
          paint(tools, LAYOUTS.handout, c, bare, lang),
          paint(tools, LAYOUTS.handout, detail, noImage, lang),
        ],
        210,
        297
      ),
      name: `${base}-handout-A4.pdf`,
    },
    ...(program
      ? [
          {
            blob: await pdf(tools, program, 210, 297),
            name: `${base}-program-A4-double-sided.pdf`,
          },
        ]
      : []),
    ...(await pngs(slides, "carousel")),
    ...(await pngs(stories, "story")),
    {
      blob: await png(paint(tools, LAYOUTS.screen, c, withPartners, lang)),
      name: `${base}-screen-1920x1080.png`,
    },
    {
      blob: await pdf(
        tools,
        [
          paintSign(
            tools,
            LAYOUTS.tent,
            { heading: words.checkIn, text: words.checkInText },
            art,
            lang,
            true
          ),
        ],
        297,
        210
      ),
      name: `${base}-tent-check-in.pdf`,
    },
    ...(await Promise.all(
      doors.map(async ([name, sign]) => ({
        blob: await pdf(
          tools,
          [paintSign(tools, LAYOUTS.door, sign, art, lang)],
          210,
          297
        ),
        name: `${base}-${name}.pdf`,
      }))
    )),
    {
      blob: await png(
        paintSign(
          tools,
          LAYOUTS.thanks,
          {
            dark: true,
            heading: words.thanks,
            text: `${c.title}. ${words.thanksText}`,
          },
          withPartners,
          lang
        )
      ),
      name: `${base}-thank-you.png`,
    },
    {
      blob: await png(paint(tools, LAYOUTS.telegram, c, withPartners, lang)),
      name: `${base}-telegram.png`,
    },
    {
      blob: await png(paint(tools, LAYOUTS.preview, c, bare, lang)),
      name: `${base}-preview.png`,
    },
  ];
};

const maybeImage = (src: string | null) =>
  src ? loadImage(src).catch(() => null) : Promise.resolve(null);

/** The partners' white logos, by address, from the register. */
const whiteLogos = async (client: Client, slugs: string[]) => {
  if (slugs.length === 0) {
    return new Map<string, string>();
  }
  const rows =
    unwrap(
      await client
        .schema("api")
        .from("partners")
        .select("slug, logo_white_path")
        .in("slug", slugs)
    ) ?? [];
  return new Map(
    rows
      .filter((r) => r.logo_white_path)
      .map((r) => [r.slug, r.logo_white_path as string])
  );
};

const LINES = ["cosponsor", "thanks"] as const;

const buildKit = async (
  event: PromoEvent,
  client: Client
): Promise<KitFile[]> => {
  const [faces, tools, program, withOrgs] = await Promise.all([
    facesOf(),
    loadTools(),
    events.programItems(client, event.id),
    events.eventOrganizations(client, event.slug),
  ]);
  const white = await whiteLogos(
    client,
    withOrgs.map((o) => o.slug)
  );
  const [
    image,
    lockupEn,
    lockupAr,
    darkEn,
    darkAr,
    markEn,
    markAr,
    stills,
    partnerLogos,
  ] = await Promise.all([
    maybeImage(mediaUrl(event.image_path)),
    loadImage(logos.horizontal.onLight),
    loadImage(logos["horizontal-ar"].onLight),
    loadImage(logos.horizontal.onDark),
    loadImage(logos["horizontal-ar"].onDark),
    loadImage("/brand/sal-wordmark-en-reversed.svg"),
    loadImage("/brand/sal-wordmark-ar-reversed.svg"),
    Promise.all(program.map((item) => maybeImage(mediaUrl(item.still_path)))),
    Promise.all(
      withOrgs.map((o) => maybeImage(mediaUrl(white.get(o.slug) ?? null)))
    ),
  ]);
  // The white logo where the register has one; the name in words otherwise.
  const rowsIn = (lang: Lang): PartnerRow[] =>
    LINES.map((line) => ({
      items: withOrgs.flatMap((o, i) =>
        o.line === line
          ? [
              {
                logo: partnerLogos[i] ?? null,
                name: (lang === "ar" ? o.name_ar : o.name_en) || o.name_en,
              },
            ]
          : []
      ),
      label:
        line === "cosponsor"
          ? KIT_WORDS[lang].coSponsoredBy
          : KIT_WORDS[lang].thanksTo,
    })).filter((row) => row.items.length > 0);
  const extras: Extras = {
    partners: { ar: rowsIn("ar"), en: rowsIn("en") },
    program: program.map((item, i) => ({ item, still: stills[i] ?? null })),
  };
  const en = await filesFor(
    tools,
    event,
    "en",
    { faces, image, lockup: lockupEn, lockupDark: darkEn, wordmark: markEn },
    extras
  );
  const ar = await filesFor(
    tools,
    event,
    "ar",
    { faces, image, lockup: lockupAr, lockupDark: darkAr, wordmark: markAr },
    extras
  );
  const files = [...en, ...ar];
  return [
    ...(await Promise.all(files.map((f) => accessible(tools, event, f)))),
    {
      blob: new Blob([captions(event)], { type: "text/plain;charset=utf-8" }),
      name: `${event.slug}-captions.txt`,
    },
  ];
};

/**
 * Each PDF made accessible (PDF/UA): its title and language from the file,
 * and each page's alternative text naming the event and what the page is.
 */
const accessible = async (
  tools: Tools,
  event: PromoEvent,
  file: KitFile
): Promise<KitFile> => {
  if (!file.name.endsWith(".pdf")) {
    return file;
  }
  const lang = file.name.includes(`-${LANG_TAG.ar}-`) ? "ar" : "en";
  const title = lang === "ar" ? event.title_ar : event.title_en;
  const what = file.name
    .slice(event.slug.length + 1, -".pdf".length)
    .replace(`${LANG_TAG[lang]}-`, "")
    .replaceAll("-", " ");
  const doc = await tools.PDFDocument.load(await file.blob.arrayBuffer());
  // The event's image, described (its alt text), where the piece shows it.
  const alt = lang === "ar" ? event.image_alt_ar : event.image_alt_en;
  const label = `${title} (${what})`;
  const described = alt && event.image_path ? `${label}. ${alt}` : label;
  tools.tagForPdfUa(doc, {
    alt: doc
      .getPages()
      .map((_, i) =>
        doc.getPageCount() > 1 ? `${described}, ${i + 1}` : described
      ),
    lang,
    title: label,
  });
  return {
    ...file,
    blob: new Blob([new Uint8Array(await doc.save())], {
      type: "application/pdf",
    }),
  };
};

/** A downloadable file, its address freed when the kit goes. */
const FileLink = ({ file }: { readonly file: KitFile }) => {
  const [href, setHref] = useState<string | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file.blob);
    setHref(url);
    return () => URL.revokeObjectURL(url);
  }, [file.blob]);
  return href ? (
    <a className="link" download={file.name} href={href}>
      {file.name}
    </a>
  ) : null;
};

export const PromoKit = ({ event }: { readonly event: PromoEvent }) => {
  const t = useTranslations("diwan.admin.event.promo");
  const { supabase } = useAuth();
  const [files, setFiles] = useState<KitFile[] | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");
  const [saved, setSaved] = useState(false);
  const build = async () => {
    setState("busy");
    setSaved(false);
    try {
      const built = await buildKit(event, supabase);
      setFiles(built);
      await saveToLibrary(supabase, event, built);
      setSaved(true);
      setState("idle");
    } catch {
      setState("failed");
    }
  };
  return (
    <DiwanSection id="promo" title={t("title")}>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={state === "busy"}
          onClick={build}
          size="sm"
          type="button"
          variant="outline"
        >
          {state === "busy" ? t("building") : t("build")}
        </Button>
      </div>
      {state === "failed" ? (
        <p className="text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
      {saved ? (
        <p className="type-caption" role="status">
          {t("savedToLibrary")}
        </p>
      ) : null}
      {files ? (
        <RowList>
          {files.map((file) => (
            <li key={file.name}>
              <FileLink file={file} />
            </li>
          ))}
        </RowList>
      ) : null}
    </DiwanSection>
  );
};
