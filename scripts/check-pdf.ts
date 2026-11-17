#!/usr/bin/env bun
/**
 * PDF/UA (ISO 14289) for every PDF the site makes (decisions.md, Frameworks
 * followed: People). Print is otherwise the page printed from the browser.
 * Fails when a module makes a PDF without tagging it through
 * `tagForPdfUa` (apps/web/lib/pdf-ua.ts, tested in pdf-ua.test.ts), when a
 * workspace adds another library that writes PDFs, or when a PDF is
 * committed. The exceptions, each with its reason, are listed below.
 */
import { readFile } from "node:fs/promises";
import { $ } from "bun";

/** Libraries that write PDFs; pdf-lib is the one the site uses. */
const OTHER_WRITERS = [
  "@react-pdf/renderer",
  "jspdf",
  "pdfkit",
  "pdfmake",
  "puppeteer",
];

const EXCEPTIONS: Record<string, string> = {
  // A blind copy is the writer's own PDF with its metadata removed: their
  // document, not one the site makes.
  "apps/web/lib/api/blind-copy.ts": "a person's own file",
  // The brand kit's print files for the printer (CMYK, PDF/X), made offline
  // and never served by the site.
  "packages/brand/scripts/print.ts": "print files for the printer",
};
/** Committed PDFs: test uploads standing for a writer's own file. */
const FIXTURES = "apps/e2e/files/";

const MAKES = /PDFDocument\.create\(|\bpage\.pdf\(/u;
const TAGS = /tagForPdfUa\(/u;

const tracked = (await $`git ls-files`.text()).split("\n").filter(Boolean);
const problems: string[] = [];

for (const file of tracked) {
  if (file.toLowerCase().endsWith(".pdf") && !file.startsWith(FIXTURES)) {
    problems.push(`${file}: a PDF in the repository`);
  }
}

const manifests = await Promise.all(
  tracked
    .filter((f) => f.endsWith("package.json"))
    .map(async (file) => ({
      file,
      manifest: JSON.parse(await readFile(file, "utf8")) as Record<
        string,
        Record<string, string> | undefined
      >,
    }))
);
for (const { file, manifest } of manifests) {
  for (const field of ["dependencies", "devDependencies"]) {
    for (const name of Object.keys(manifest[field] ?? {})) {
      if (OTHER_WRITERS.includes(name)) {
        problems.push(`${file}: ${name} writes PDFs`);
      }
    }
  }
}

const SOURCE = /\.(ts|tsx)$/u;
const sources = await Promise.all(
  tracked
    .filter(
      (f) =>
        SOURCE.test(f) &&
        !f.endsWith(".test.ts") &&
        !f.startsWith("apps/e2e/") &&
        !(f in EXCEPTIONS)
    )
    .map(async (file) => ({ file, source: await readFile(file, "utf8") }))
);
for (const { file, source } of sources) {
  if (MAKES.test(source) && !TAGS.test(source)) {
    problems.push(`${file}: makes a PDF without tagForPdfUa`);
  }
}

if (problems.length > 0) {
  console.error("Every PDF the site makes passes PDF/UA (ISO 14289):");
  for (const problem of problems) {
    console.error(`  ${problem}`);
  }
  process.exit(1);
}
console.log("PDF/UA: every PDF the site makes is tagged.");
