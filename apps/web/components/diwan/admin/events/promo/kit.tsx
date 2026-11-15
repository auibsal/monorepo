"use client";

import { Button } from "@repo/brand/components/ui/button";
import { logos } from "@repo/brand/lib/logos";
import { siteUrl } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { useTranslations } from "next-intl";
import { PDFDocument } from "pdf-lib";
import { useEffect, useState } from "react";
import { mediaUrl } from "@/lib/media";
import { DiwanSection, RowList } from "../../../page";
import {
  type Art,
  type Content,
  drawCard,
  type Faces,
  type Lang,
  type Layout,
} from "./draw";

/**
 * The promo kit (decisions.md, Events): one button on the event's page in
 * the Diwan builds, from the event's own fields and image, in English and
 * Arabic: the A3 poster and the A4 two-sided handout (PDF, a 10 mm margin
 * and the QR to the event's address), the Instagram carousel (an English
 * slide, an Arabic slide, and one per item when the description has a
 * list), the story (text clear of the top 220 and bottom 400 pixels), the
 * Telegram image (no QR), the page and link-preview image, and the
 * captions, English then Arabic. Each file downloads on its own. Media
 * posts them; nothing is uploaded.
 */

export interface PromoEvent {
  body_ar: string | null;
  body_en: string | null;
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

/** 200 dots per inch for print: mm to pixels. */
const PX_PER_MM = 200 / 25.4;
const mm = (n: number) => Math.round(n * PX_PER_MM);
const PT_PER_MM = 72 / 25.4;

const print = (wmm: number, hmm: number): Layout => ({
  height: mm(hmm),
  imageShare: 0.42,
  margin: mm(10),
  qr: true,
  safeBottom: 0,
  safeTop: 0,
  width: mm(wmm),
});

const LAYOUTS = {
  carousel: {
    height: 1350,
    imageShare: 0.42,
    margin: 80,
    qr: true,
    safeBottom: 0,
    safeTop: 0,
    width: 1080,
  },
  handout: print(210, 297),
  poster: print(297, 420),
  preview: {
    height: 630,
    imageShare: 0.45,
    margin: 56,
    qr: false,
    safeBottom: 0,
    safeTop: 0,
    width: 1200,
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

const paint = (layout: Layout, content: Content, art: Art, lang: Lang) => {
  const canvas = document.createElement("canvas");
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("canvas");
  }
  drawCard(ctx, layout, content, art, lang);
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
const pdf = async (pages: HTMLCanvasElement[], wmm: number, hmm: number) => {
  const doc = await PDFDocument.create();
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

/** Every file of the kit for one language. */
const filesFor = async (
  event: PromoEvent,
  lang: Lang,
  art: Art
): Promise<KitFile[]> => {
  const c = contentFor(event, lang);
  const base = `${event.slug}-${LANG_TAG[lang]}`;
  const detail = {
    ...c,
    summary: plain(lang === "ar" ? event.body_ar : event.body_en) || c.summary,
  };
  const noImage = { ...art, image: null };
  const items = listItems(lang === "ar" ? event.body_ar : event.body_en);
  const slides = [
    paint(LAYOUTS.carousel, c, art, lang),
    ...items.map((item) =>
      paint(LAYOUTS.carousel, { ...c, item }, noImage, lang)
    ),
  ];
  return [
    {
      blob: await pdf([paint(LAYOUTS.poster, c, art, lang)], 297, 420),
      name: `${base}-poster-A3.pdf`,
    },
    {
      blob: await pdf(
        [
          paint(LAYOUTS.handout, c, art, lang),
          paint(LAYOUTS.handout, detail, noImage, lang),
        ],
        210,
        297
      ),
      name: `${base}-handout-A4.pdf`,
    },
    ...(await Promise.all(
      slides.map(async (canvas, i) => ({
        blob: await png(canvas),
        name: `${base}-carousel-${i + 1}.png`,
      }))
    )),
    {
      blob: await png(paint(LAYOUTS.story, c, art, lang)),
      name: `${base}-story.png`,
    },
    {
      blob: await png(paint(LAYOUTS.telegram, c, art, lang)),
      name: `${base}-telegram.png`,
    },
    {
      blob: await png(paint(LAYOUTS.preview, c, art, lang)),
      name: `${base}-preview.png`,
    },
  ];
};

const buildKit = async (event: PromoEvent): Promise<KitFile[]> => {
  const faces = await facesOf();
  const imageUrl = mediaUrl(event.image_path);
  const [image, lockupEn, lockupAr] = await Promise.all([
    imageUrl ? loadImage(imageUrl).catch(() => null) : Promise.resolve(null),
    loadImage(logos.horizontal.onLight),
    loadImage(logos["horizontal-ar"].onLight),
  ]);
  const en = await filesFor(event, "en", { faces, image, lockup: lockupEn });
  const ar = await filesFor(event, "ar", { faces, image, lockup: lockupAr });
  return [
    ...en,
    ...ar,
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
  const [files, setFiles] = useState<KitFile[] | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");
  const build = async () => {
    setState("busy");
    try {
      setFiles(await buildKit(event));
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
