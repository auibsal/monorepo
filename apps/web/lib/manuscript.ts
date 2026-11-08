"use client";

import { sanitizeRichText, toPlainText } from "@repo/sal-data";
import {
  layoutPages,
  type TextPage,
  textItem,
  withDirection,
} from "./text-layout";

const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** A PDF's text laid out again: verse lines, paragraphs and headings. */
const pdfHtml = async (file: File) => {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  // The fonts' own names say which runs are italic or bold.
  const doc = await pdfjs.getDocument({
    data: await file.arrayBuffer(),
    fontExtraProperties: true,
  }).promise;
  const pages: TextPage[] = await Promise.all(
    Array.from({ length: doc.numPages }, async (_, i) => {
      const page = await doc.getPage(i + 1);
      const content = await page.getTextContent();
      // The fonts are loaded (with their names) as the page is drawn.
      await page.getOperatorList();
      const fontName = (id: string) => {
        try {
          return (page.commonObjs.get(id) as { name?: string } | null)?.name;
        } catch {
          return "";
        }
      };
      return {
        items: content.items.flatMap((item) =>
          "str" in item ? [textItem(item, fontName(item.fontName))] : []
        ),
        width: page.getViewport({ scale: 1 }).width,
      };
    })
  );
  return layoutPages(pages);
};

/** Word's styles as the editor's: headings, underline, strikethrough. */
const STYLE_MAP = [
  "p[style-name='Title'] => h2:fresh",
  "p[style-name='Heading 1'] => h2:fresh",
  "p[style-name='Heading 2'] => h3:fresh",
  "p[style-name='Heading 3'] => h4:fresh",
  "u => u",
  "strike => s",
];

/** A Word file as HTML: headings, paragraphs, lists, bold and italics. */
const docxHtml = async (file: File) => {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.convertToHtml(
    { arrayBuffer: await file.arrayBuffer() },
    { styleMap: STYLE_MAP }
  );
  return withDirection(value);
};

/**
 * A manuscript's text for the editor (decisions.md): a Word file or
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
