"use client";

import { Button } from "@repo/brand/components/ui/button";
import { logos } from "@repo/brand/lib/logos";
import { siteUrl } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { type Client, events } from "@/lib/data";
import { acknowledged } from "@/lib/institutions";
import { mediaUrl } from "@/lib/media";
import { DiwanSection, RowList } from "../../../page";
import type { Art, Content, Faces, Lang, Layout, Sign } from "./draw";
import { goodToKnowLines, KIT_WORDS, type KitFacts } from "./words";

/** The drawing code, the QR and the PDF writer load only when a kit is built. */
type Tools = Awaited<ReturnType<typeof loadTools>>;
const loadTools = async () => {
  const [
    { drawCard, drawProgram, drawSign, drawTent },
    { PDFDocument },
    { accessSentence },
  ] = await Promise.all([
    import("./draw"),
    import("pdf-lib"),
    import("@repo/email/copy"),
  ]);
  return {
    accessSentence,
    drawCard,
    drawProgram,
    drawSign,
    drawTent,
    PDFDocument,
  };
};

/**
 * The promo kit (decisions.md, Events): one button on the event's page in
 * the Diwan builds everything from the event's own fields, image and
 * Program, and the brand kit's templates, in English and Arabic:
 * - the Instagram carousel: a cover, one card per work in the Program
 *   (its still, or its number when it has none) and "Good to know";
 * - the stories: the cover, one per work, "Tomorrow" and "Today" (text
 *   clear of the top 220 and bottom 400 pixels);
 * - the A3 poster and an A1 for easels (a 10 mm white margin and the QR to
 *   the event's page), the A4 two-sided handout, and a 1920 × 1080 version
 *   for campus screens;
 * - the A5 program, one page per language, and an A4 sheet with two
 *   programs, printed double-sided (English, then Arabic);
 * - the check-in and join table tents (folded A4);
 * - the door signs: in progress, photos and the content note;
 * - the "Thanks for coming" card, with the co-sponsors' logos;
 * - the Telegram image, the link preview and the captions.
 * Each file downloads on its own. Media posts them; nothing is uploaded.
 */

export interface PromoEvent extends KitFacts {
  body_ar: string | null;
  body_en: string | null;
  ends_at: string | null;
  id: string;
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

const print = (wmm: number, hmm: number, dpi = 200): Layout => ({
  height: mm(hmm, dpi),
  imageShare: 0.42,
  margin: mm(10, dpi),
  qr: true,
  safeBottom: 0,
  safeTop: 0,
  width: mm(wmm, dpi),
});

/** A poster with its 10 mm white margin and the type set 10 mm inside it. */
const poster = (wmm: number, hmm: number, dpi = 200): Layout => ({
  ...print(wmm, hmm, dpi),
  border: mm(10, dpi),
  margin: mm(12, dpi),
});

const LAYOUTS = {
  a1: poster(594, 841, 100),
  a5: print(148, 210),
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
    margin: 56,
    qr: false,
    safeBottom: 0,
    safeTop: 0,
    width: 1200,
  },
  screen: {
    height: 1080,
    imageShare: 0.45,
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

/** The captions: English, then Arabic (decisions.md, Events). */
const captions = (event: PromoEvent) =>
  (["en", "ar"] as const)
    .map((lang) => {
      const c = contentFor(event, lang);
      return [
        c.title,
        [c.date, c.venue].filter(Boolean).join(" · "),
        c.summary,
        c.url,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

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
  /** The co-sponsors' logos, for the thank-you card. */
  logos: (CanvasImageSource & { height: number; width: number })[];
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

const paintProgram = (
  tools: Tools,
  event: PromoEvent,
  extras: Extras,
  art: Art,
  lang: Lang
) => {
  const layout = LAYOUTS.a5;
  const canvas = document.createElement("canvas");
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("canvas");
  }
  const c = contentFor(event, lang);
  tools.drawProgram(
    ctx,
    layout,
    {
      date: c.date,
      items: extras.program.map(({ item }) => ({
        facts: facts(item, lang),
        line: [own(item, "line", lang), own(item, "award", lang)]
          .filter(Boolean)
          .join(" "),
        title: own(item, "title", lang),
      })),
      title: c.title,
      venue: c.venue,
    },
    art,
    lang
  );
  return canvas;
};

/** Two A5 programs side by side on one A4 sheet (landscape). */
const twoUp = (program: HTMLCanvasElement) => {
  const canvas = document.createElement("canvas");
  canvas.width = program.width * 2;
  canvas.height = program.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("canvas");
  }
  ctx.drawImage(program, 0, 0);
  ctx.drawImage(program, program.width, 0);
  return canvas;
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
  const noImage = { ...art, image: null };
  const items = listItems(lang === "ar" ? event.body_ar : event.body_en);
  // A work's card: its still, or its number; the facts in the date's place.
  const works = extras.program.map(({ item, still }, i) => ({
    art: { ...art, image: still },
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
  const slides = [
    paint(tools, LAYOUTS.carousel, c, art, lang),
    ...works.map((w) => paint(tools, LAYOUTS.carousel, w.content, w.art, lang)),
    // Without a Program, a list in the description still gets its slides.
    ...(works.length === 0
      ? items.map((item) =>
          paint(tools, LAYOUTS.carousel, { ...c, item }, noImage, lang)
        )
      : []),
    paint(tools, LAYOUTS.carousel, goodToKnow, noImage, lang),
  ];
  const stories = [
    paint(tools, LAYOUTS.story, c, art, lang),
    ...works.map((w) => paint(tools, LAYOUTS.story, w.content, w.art, lang)),
    paint(
      tools,
      LAYOUTS.story,
      { ...c, date: `${words.tomorrow} · ${time}` },
      art,
      lang
    ),
    paint(
      tools,
      LAYOUTS.story,
      { ...c, date: `${words.today} · ${time}` },
      art,
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
      ? paintProgram(tools, event, extras, art, lang)
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
        [paint(tools, LAYOUTS.poster, c, art, lang)],
        297,
        420
      ),
      name: `${base}-poster-A3.pdf`,
    },
    {
      blob: await pdf(
        tools,
        [paint(tools, LAYOUTS.a1, c, art, lang)],
        594,
        841
      ),
      name: `${base}-poster-A1.pdf`,
    },
    {
      blob: await pdf(
        tools,
        [
          paint(tools, LAYOUTS.handout, c, art, lang),
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
            blob: await pdf(tools, [program], 148, 210),
            name: `${base}-program-A5.pdf`,
          },
        ]
      : []),
    ...(await pngs(slides, "carousel")),
    ...(await pngs(stories, "story")),
    {
      blob: await png(paint(tools, LAYOUTS.screen, c, art, lang)),
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
    {
      blob: await pdf(
        tools,
        [
          paintSign(
            tools,
            LAYOUTS.tent,
            {
              heading: words.join,
              qr: siteUrl(lang, "/join"),
              text: words.joinText,
            },
            art,
            lang,
            true
          ),
        ],
        297,
        210
      ),
      name: `${base}-tent-join.pdf`,
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
            heading: words.thanks,
            logos: extras.logos,
            text: `${c.title}. ${words.thanksText}`,
          },
          art,
          lang
        )
      ),
      name: `${base}-thank-you.png`,
    },
    {
      blob: await png(paint(tools, LAYOUTS.telegram, c, art, lang)),
      name: `${base}-telegram.png`,
    },
    {
      blob: await png(paint(tools, LAYOUTS.preview, c, art, lang)),
      name: `${base}-preview.png`,
    },
  ];
};

const maybeImage = (src: string | null) =>
  src ? loadImage(src).catch(() => null) : Promise.resolve(null);

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
  const [image, lockupEn, lockupAr, stills, sponsorLogos] = await Promise.all([
    maybeImage(mediaUrl(event.image_path)),
    loadImage(logos.horizontal.onLight),
    loadImage(logos["horizontal-ar"].onLight),
    Promise.all(program.map((item) => maybeImage(mediaUrl(item.still_path)))),
    Promise.all(
      withOrgs
        .filter((o) => o.line === "cosponsor")
        .map((o) => maybeImage(acknowledged(o, "en").logo?.src ?? null))
    ),
  ]);
  const extras: Extras = {
    logos: sponsorLogos.filter((l): l is HTMLImageElement => l !== null),
    program: program.map((item, i) => ({ item, still: stills[i] ?? null })),
  };
  const en = await filesFor(
    tools,
    event,
    "en",
    { faces, image, lockup: lockupEn },
    extras
  );
  const ar = await filesFor(
    tools,
    event,
    "ar",
    { faces, image, lockup: lockupAr },
    extras
  );
  // The A4 sheet of two programs, double-sided: English, then Arabic.
  const sheets =
    program.length > 0
      ? [
          {
            blob: await pdf(
              tools,
              [
                twoUp(
                  paintProgram(
                    tools,
                    event,
                    extras,
                    { faces, image, lockup: lockupEn },
                    "en"
                  )
                ),
                twoUp(
                  paintProgram(
                    tools,
                    event,
                    extras,
                    { faces, image, lockup: lockupAr },
                    "ar"
                  )
                ),
              ],
              296,
              210
            ),
            name: `${event.slug}-programs-A4-double-sided.pdf`,
          },
        ]
      : [];
  return [
    ...en,
    ...ar,
    ...sheets,
    {
      blob: new Blob([captions(event)], { type: "text/plain;charset=utf-8" }),
      name: `${event.slug}-captions.txt`,
    },
  ];
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
  const build = async () => {
    setState("busy");
    try {
      setFiles(await buildKit(event, supabase));
      setState("idle");
    } catch {
      setState("failed");
    }
  };
  return (
    <DiwanSection id="promo" title={t("title")}>
      <p className="type-body">{t("lede")}</p>
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
