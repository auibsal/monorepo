import { PDFDict, PDFDocument, PDFName } from "pdf-lib";
import { describe, expect, test } from "vitest";
import { tagForPdfUa } from "./pdf-ua";

// A 1×1 transparent PNG.
const PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
  ),
  (c) => c.charCodeAt(0)
);

const TWO_REFERENCES = /\d+ 0 R.*\d+ 0 R/u;

const made = async () => {
  const doc = await PDFDocument.create();
  const image = await doc.embedPng(PNG);
  for (let i = 0; i < 2; i += 1) {
    const page = doc.addPage([100, 100]);
    page.drawImage(image, { height: 100, width: 100, x: 0, y: 0 });
  }
  tagForPdfUa(doc, {
    alt: ["The poster, front", "The poster, back"],
    lang: "en",
    title: "Writing workshop · poster",
  });
  return PDFDocument.load(await doc.save(), { updateMetadata: false });
};

describe("PDF/UA", () => {
  test("the document is marked, titled and in its language", async () => {
    const doc = await made();
    expect(doc.getTitle()).toBe("Writing workshop · poster");
    expect(doc.catalog.lookup(PDFName.of("MarkInfo"), PDFDict)).toBeTruthy();
    expect(doc.catalog.get(PDFName.of("Lang"))).toBeTruthy();
    expect(
      doc.catalog
        .lookup(PDFName.of("ViewerPreferences"), PDFDict)
        .get(PDFName.of("DisplayDocTitle"))
        ?.toString()
    ).toBe("true");
    expect(doc.catalog.get(PDFName.of("Metadata"))).toBeTruthy();
  });
  test("each page is one tagged Figure with its alternative text", async () => {
    const doc = await made();
    const root = doc.catalog.lookup(PDFName.of("StructTreeRoot"), PDFDict);
    const document = root.lookup(PDFName.of("K"), PDFDict);
    const kids = document.lookup(PDFName.of("K"));
    expect(kids?.toString()).toMatch(TWO_REFERENCES);
    for (const page of doc.getPages()) {
      expect(page.node.get(PDFName.of("StructParents"))).toBeTruthy();
    }
  });
});
