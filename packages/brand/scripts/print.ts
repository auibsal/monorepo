/**
 * Print files (SAL-MED-02, Print): makes the PDFs Student Life prints from,
 * into dist/print, which is never committed. `bun run print`.
 *
 * - The sticker pack: a cover ("SAL-MED-02 · Sticker pack") with the specs,
 *   an overview page per group at 47%, and one page per sticker at 100% with
 *   its magenta cut line, from assets/print/stickers (stickers.json and the
 *   SVGs).
 * - Every HTML page in assets/print/posters and assets/print/printables.html,
 *   printed as it is; each file is named after its <title>.
 *
 * Fonts load from Google Fonts (Ubuntu) and assets/fonts (Ubuntu Arabic), so
 * run it online.
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { chromium } from "@playwright/test";

const ROOT = resolve(import.meta.dirname, "..");
const ASSETS = join(ROOT, "assets");
const STICKERS = join(ASSETS, "print/stickers");
const OUT = join(ROOT, "dist/print");

interface Sticker {
  cut: [number, number];
  family: string;
  id: string;
  name: string;
  size: [number, number];
}

const SIZE = /\swidth="[^"]+"\s+height="[^"]+"/;
const XML = /<\?xml[^>]*\?>\s*/;
const CUT = /stroke="(?:#ec008c|rgb\(92\.5[^"]*\))"/gi;
const TITLE = /<title>([^<]+)<\/title>/;
const UNSAFE = /[\\/:*?"<>|]/g;

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

  pages.push(`<section class="a4"><div class="top"><div class="lock">${lockup}</div><p class="code">SAL-MED-02 · Sticker pack</p></div>
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
@font-face{font-family:"Ubuntu Arabic";src:url(${fonts}/UbuntuArabic-Regular.woff2)}
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

await mkdir(OUT, { recursive: true });
const posters = (await readdir(join(ASSETS, "print/posters")))
  .filter((f) => f.endsWith(".html"))
  .map((f) => join(ASSETS, "print/posters", f));
const files = [
  await stickerPack(),
  ...posters,
  join(ASSETS, "print/printables.html"),
];

const browser = await chromium.launch();
for (const file of files) {
  // One page at a time, in order, so the log reads as the files are made.
  // biome-ignore lint/performance/noAwaitInLoops: printed one by one, in order
  const page = await browser.newPage();
  await page.goto(`file://${file}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const title = (TITLE.exec(await readFile(file, "utf8"))?.[1] ?? file)
    .replace(" · ", " ")
    .replace(UNSAFE, "");
  const pdf = join(OUT, `${title}.pdf`);
  await page.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });
  await page.close();
  console.log(relative(ROOT, pdf));
}
await browser.close();
