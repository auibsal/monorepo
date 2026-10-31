"use client";

import { sanitizeRichText, toPlainText } from "@repo/sal-data";

const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const escapeHtml = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

/** Lines into paragraphs: a blank line starts a new one. */
const paragraphs = (lines: string[]) => {
  const out: string[] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length > 0) {
      out.push(`<p>${escapeHtml(current.join(" "))}</p>`);
      current = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") {
      flush();
    } else {
      current.push(line);
    }
  }
  flush();
  return out.join("");
};

/** A PDF's text, page by page; the line breaks the PDF carries. */
const pdfHtml = async (file: File) => {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() })
    .promise;
  const pages = await Promise.all(
    Array.from({ length: doc.numPages }, async (_, i) =>
      (await doc.getPage(i + 1)).getTextContent()
    )
  );
  const lines: string[] = [];
  for (const content of pages) {
    let line = "";
    let lastY: number | null = null;
    for (const item of content.items) {
      if (!("str" in item)) {
        continue;
      }
      const y = item.transform[5] ?? 0;
      // A jump of more than a line and a half is a paragraph break.
      if (lastY !== null && Math.abs(lastY - y) > (item.height || 12) * 1.6) {
        lines.push(line, "");
        line = "";
      }
      line += item.str;
      if (item.hasEOL) {
        lines.push(line);
        line = "";
      }
      lastY = y;
    }
    lines.push(line, "");
  }
  return paragraphs(lines);
};

/** A Word file as HTML: headings, paragraphs, lists, bold and italics. */
const docxHtml = async (file: File) => {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.convertToHtml({
    arrayBuffer: await file.arrayBuffer(),
  });
  return value;
};

/**
 * A manuscript's text for the editor (owner, Oct 31, 2026): a Word file or
 * a PDF read in the browser, cleaned to what the editor keeps. The file
 * itself is still sent with the work, so the editors have the original.
 * Null when nothing could be read (a scanned PDF has no text).
 */
export const manuscriptHtml = async (file: File) => {
  let html = "";
  if (file.type === DOCX || file.name.toLowerCase().endsWith(".docx")) {
    html = await docxHtml(file);
  } else if (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  ) {
    html = await pdfHtml(file);
  }
  const clean = sanitizeRichText(html);
  return toPlainText(clean) ? clean : null;
};
