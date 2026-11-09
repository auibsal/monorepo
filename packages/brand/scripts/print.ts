/**
 * The brand's files (SAL-MED-02; decisions §14): one version of every
 * design, with no code line on it; the code is in the file name instead
 * ("SAL-MED-02-Haven-poster-EN.pdf"). Everything goes into dist/, which is
 * never committed. `bun run print`.
 *
 * - Print: CMYK PDFs for coated paper (FOGRA39), into dist/print. Every HTML
 *   page in assets/print/posters, assets/print/printables.html and the
 *   sticker pack (a cover with the specs, an overview page per group at
 *   47%, and one page per sticker at 100% with its magenta cut line). Each
 *   page is printed by the browser (RGB) and converted with Ghostscript:
 *   `gs -sColorConversionStrategy=CMYK -sOutputICCProfile=<FOGRA39>`. The
 *   profile is FOGRA39L_coated.icc (or ECI's ISOcoated_v2), not kept in the
 *   repository: point FOGRA39_ICC at it.
 * - Screens: RGB PNGs at their pixel size, into dist/social: the posts,
 *   stories, highlight covers and avatars in assets/social. With
 *   `--in-place`, each PNG beside its HTML in assets/social is refreshed too.
 *
 * A file's name is the code, its <title> (after "SAL-MED-02 · ") and its
 * language from <html lang>: "SAL-MED-02-Society-poster-AR.pdf". Fonts load
 * from Google Fonts and assets/fonts, so run it online.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { chromium } from "@playwright/test";

const ROOT = resolve(import.meta.dirname, "..");
const ASSETS = join(ROOT, "assets");
const STICKERS = join(ASSETS, "print/stickers");
const OUT = join(ROOT, "dist/print");
const SCREENS = join(ROOT, "dist/social");
const SOCIAL = join(ASSETS, "social");
const IN_PLACE = process.argv.includes("--in-place");

interface Sticker {
  cut: [number, number];
  family: string;
  id: string;
  name: string;
  size: [number, number];
}

const SIZE = /\swidth="[^"]+"\s+height="[^"]+"/u;
const XML = /<\?xml[^>]*\?>\s*/u;
const CUT = /stroke="(?:#ec008c|rgb\(92\.5[^"]*\))"/giu;
const TITLE = /<title>([^<]+)<\/title>/u;
const LANG = /<html[^>]*\slang="([a-z]+)"/u;
const UNSAFE = /[\\/:*?"<>|,()]/gu;
const CODE_PREFIX = /^SAL-MED-02\s*·\s*/u;
const SPACES = /\s+/u;

/** "SAL-MED-02 · Society poster" in Arabic → "SAL-MED-02-Society-poster-AR". */
export const fileName = (title: string, lang: string) =>
  [
    "SAL-MED-02",
    ...title.replace(CODE_PREFIX, "").replace(UNSAFE, "").trim().split(SPACES),
    lang.toUpperCase(),
  ].join("-");

/** Each sticker's SVG at the given size (CSS), with its XML declaration dropped. */
const sized = (source: string, style: string) =>
  source.replace(XML, "").replace(SIZE, ` style="${style}"`);

const stickerPack = async () => {
  const list: Sticker[] = JSON.parse(
    await readFile(join(STICKERS, "stickers.json"), "utf8")
  );
  const sources = new Map(
    await Promise.all(
      list.map(
        async (s) =>
          [s.id, await readFile(join(STICKERS, `${s.id}.svg`), "utf8")] as const
      )
    )
  );
  const svg = (id: string, style: string) =>
    sized(sources.get(id) ?? "", style);
  const families = [...new Set(list.map((s) => s.family))];
  const mm = ([w, h]: [number, number]) =>
    `${Math.round(w)} × ${Math.round(h)} mm`;
  const css = ["@page{size:A4;margin:0}"];
  const pages: string[] = [];
  const fonts = relative(OUT, join(ASSETS, "fonts"));
  const lockup = await readFile(
    join(ASSETS, "logos/sal-lockup-horizontal.svg"),
    "utf8"
  );

  pages.push(`<section class="a4"><div class="top"><div class="lock">${lockup}</div></div>
<h1>Sticker pack</h1><p class="lede">${list.length} stickers for the Society, for Student Life to print.</p>
<div class="specs">
<div><h3>Cut</h3><p>Each sticker is die-cut on its magenta line, named CutContour. The line is the cut only and is not printed.</p></div>
<div><h3>Size</h3><p>Every sticker page is at 100%, its size given in the overview. Scale the whole pack, never a single sticker’s parts.</p></div>
<div><h3>Material</h3><p>White vinyl, matte. Every sticker is cut on its own edge or on its ground: no white borders.</p></div>
<div><h3>Color</h3><p>The Society’s colors only: crimson #9C213E, ink #273236, paper #F5F2EE, stone #E2DDD6, ash #5C6568 and white. No other color, and no pink.</p></div>
<div><h3>Bleed</h3><p>Shapes printed to their edge carry 1.5 mm of bleed past the cut. Keep text 2 mm inside every cut.</p></div>
<div><h3>Quantity</h3><p>Print to the confirmed need: the expected joiners at the club fair or the Typewriter Tour, plus 10%, as requested through the General Secretary’s needs list.</p></div>
<div><h3>Questions</h3><p>hello@auibsal.org</p></div>
</div></section>`);

  for (const family of families) {
    const cells = list
      .filter((s) => s.family === family)
      .map(
        (s) =>
          `<figure><div style="width:${(s.size[0] * 0.47).toFixed(1)}mm">${svg(
            s.id,
            "width:100%;height:auto;display:block"
          ).replace(
            CUT,
            'stroke="none"'
          )}</div><figcaption>${s.name}<span>${mm(s.cut)}</span></figcaption></figure>`
      );
    pages.push(
      `<section class="a4"><h2>${family}</h2><div class="grid">${cells.join("")}</div><footer>Shown at 47%. Print files follow, one sticker per page at 100%.</footer></section>`
    );
  }

  pages.push(
    `<section class="a4"><h2>Print files</h2><p class="lede">One sticker per page, at 100%, with its cut line in magenta. Color running past the magenta line is bleed: it is cut away, so the edge of each sticker is the line, not the color.</p></section>`
  );

  for (const s of list) {
    const [w, h] = s.size;
    const page = `p_${s.id.replaceAll("-", "_")}`;
    css.push(`@page ${page}{size:${w}mm ${h}mm;margin:0}`);
    pages.push(
      `<section style="page:${page};width:${w}mm;height:${h}mm">${svg(s.id, `width:${w}mm;height:${h}mm;display:block`)}</section>`
    );
  }

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>SAL-MED-02 · Sticker pack</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500&family=Ubuntu+Mono&display=swap">
<style>
@font-face{font-family:Ubuntu;src:url(${fonts}/UbuntuArabic-Regular.woff2);unicode-range:U+0600-06FF,U+0750-077F,U+0870-08FF,U+FB50-FDFF,U+FE70-FEFF}
${css.join("\n")}
body{margin:0;font-family:Ubuntu,sans-serif;color:#273236;-webkit-print-color-adjust:exact;print-color-adjust:exact}
section{break-after:page;overflow:hidden;position:relative}
.a4{width:210mm;height:297mm;box-sizing:border-box;padding:18mm}
.top{display:flex;justify-content:space-between;align-items:flex-start}
.lock svg{height:16mm;width:auto;display:block}
.code{margin:2mm 0 0;font:400 9pt "Ubuntu Mono",monospace;color:#5c6568}
h1{font-weight:300;font-size:44pt;letter-spacing:-.02em;margin:34mm 0 4mm}
h2{font-weight:300;font-size:26pt;margin:0 0 8mm;letter-spacing:-.01em}
.lede{font-size:14pt;font-weight:300;margin:0 0 16mm}
.specs{display:grid;grid-template-columns:1fr 1fr;gap:8mm 12mm;border-top:.3mm solid #e2ddd6;padding-top:8mm}
h3{font-size:7.6pt;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:#5c6568;margin:0 0 2mm}
.specs p{margin:0;font-size:10pt;line-height:1.5}
.grid{display:flex;flex-wrap:wrap;gap:8mm 9mm;align-items:flex-end}
figure{margin:0}
figcaption{font-size:8pt;margin-top:2mm;display:flex;flex-direction:column}
figcaption span{color:#5c6568}
footer{position:absolute;bottom:14mm;left:18mm;font-size:8pt;color:#5c6568}
</style></head><body>${pages.join("\n")}</body></html>`;
  const file = join(OUT, "sticker-pack.html");
  await writeFile(file, html);
  return file;
};

/** The FOGRA39 profile Ghostscript converts to; required for print files. */
const fogra = () => {
  const profile = process.env.FOGRA39_ICC;
  if (!(profile && existsSync(profile))) {
    throw new Error(
      "Print files are CMYK for FOGRA39 coated paper: set FOGRA39_ICC to FOGRA39L_coated.icc (or ECI's ISOcoated_v2_eci.icc)."
    );
  }
  return profile;
};

/** The browser's RGB PDF, converted to CMYK with Ghostscript. */
const toCmyk = (rgb: string, cmyk: string, icc: string) => {
  const run = spawnSync(
    "gs",
    [
      "-q",
      "-dNOPAUSE",
      "-dBATCH",
      "-dSAFER",
      "-sDEVICE=pdfwrite",
      "-dPDFSETTINGS=/prepress",
      "-sColorConversionStrategy=CMYK",
      "-dProcessColorModel=/DeviceCMYK",
      `-sOutputICCProfile=${icc}`,
      `-sOutputFile=${cmyk}`,
      rgb,
    ],
    { stdio: "inherit" }
  );
  if (run.status !== 0) {
    throw new Error(`Ghostscript could not convert ${rgb}`);
  }
};

const nameOf = async (file: string) => {
  const source = await readFile(file, "utf8");
  return fileName(
    TITLE.exec(source)?.[1] ?? file,
    LANG.exec(source)?.[1] ?? "en"
  );
};

const htmlIn = async (dir: string) =>
  (await readdir(dir))
    .filter((f) => f.endsWith(".html"))
    .map((f) => join(dir, f));

const profile = fogra();
await mkdir(OUT, { recursive: true });
await mkdir(SCREENS, { recursive: true });
const prints = [
  await stickerPack(),
  ...(await htmlIn(join(ASSETS, "print/posters"))),
  join(ASSETS, "print/printables.html"),
];
const screens = (
  await Promise.all(
    ["posts", "stories", "highlights", "avatars"].map((dir) =>
      htmlIn(join(SOCIAL, dir))
    )
  )
).flat();

// CHROMIUM_PATH: a browser of your own when Playwright's download is missing.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
for (const file of prints) {
  // One file at a time, in order, so the log reads as the files are made.
  // biome-ignore lint/performance/noAwaitInLoops: printed one by one, in order
  const page = await browser.newPage();
  await page.goto(`file://${file}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const name = await nameOf(file);
  const rgb = join(OUT, `${name}.rgb.pdf`);
  const pdf = join(OUT, `${name}.pdf`);
  await page.pdf({ path: rgb, preferCSSPageSize: true, printBackground: true });
  await page.close();
  toCmyk(rgb, pdf, profile);
  await rm(rgb);
  console.log(relative(ROOT, pdf));
}
for (const file of screens) {
  // biome-ignore lint/performance/noAwaitInLoops: shot one by one, in order
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.setViewportSize({ height: 1080, width: 1080 });
  await page.goto(`file://${file}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const folder = relative(SOCIAL, file).split("/")[0] ?? "";
  const base = file.slice(file.lastIndexOf("/") + 1, -".html".length);
  const png = join(SCREENS, `SAL-MED-02-${folder}-${base}.png`);
  const image = await page.screenshot({ fullPage: true, path: png });
  if (IN_PLACE) {
    await writeFile(file.replace(/\.html$/u, ".png"), image);
  }
  await page.close();
  console.log(relative(ROOT, png));
}
await browser.close();
