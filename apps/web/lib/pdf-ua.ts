import {
  PDFArray,
  type PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  type PDFRef,
} from "pdf-lib";

/**
 * PDF/UA (ISO 14289-1) for the PDFs the site makes (decisions.md,
 * Frameworks followed: People). The promo kit's PDFs are each a drawn
 * image per page, so each page becomes one tagged Figure with its
 * alternative text, inside a Document, with the title shown in the window,
 * the language, the Marked flag, a tab order, and the PDF/UA identifier in
 * the XMP metadata. `bun run check:pdf` allows no other PDF writer.
 */
export interface PdfUaMeta {
  /** Each page's alternative text, in order. */
  readonly alt: readonly string[];
  readonly lang: "ar" | "en";
  readonly title: string;
}

const escapeXml = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const xmp = (
  title: string,
  lang: string
) => `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:pdfuaid="http://www.aiim.org/pdfua/ns/id/">
   <dc:title><rdf:Alt><rdf:li xml:lang="${lang}">${escapeXml(title)}</rdf:li></rdf:Alt></dc:title>
   <dc:language><rdf:Bag><rdf:li>${lang}</rdf:li></rdf:Bag></dc:language>
   <pdfuaid:part>1</pdfuaid:part>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

export const tagForPdfUa = (doc: PDFDocument, meta: PdfUaMeta) => {
  const { context, catalog } = doc;
  doc.setTitle(meta.title, { showInWindowTitleBar: true });
  doc.setLanguage(meta.lang);
  catalog.set(PDFName.of("MarkInfo"), context.obj({ Marked: true }));
  const metadata = context.stream(xmp(meta.title, meta.lang), {
    Subtype: "XML",
    Type: "Metadata",
  });
  catalog.set(PDFName.of("Metadata"), context.register(metadata));

  const root = context.nextRef();
  const document = context.nextRef();
  const figures: PDFRef[] = [];
  const nums = PDFArray.withContext(context);
  doc.getPages().forEach((page, i) => {
    // The page's drawing, marked as the figure's content (MCID 0).
    const before = context.register(
      context.flateStream("/Figure <</MCID 0>> BDC\n")
    );
    const after = context.register(context.flateStream("\nEMC\n"));
    page.node.normalize();
    const contents = page.node.Contents();
    if (contents instanceof PDFArray) {
      contents.insert(0, before);
      contents.push(after);
    }
    page.node.set(PDFName.of("StructParents"), PDFNumber.of(i));
    page.node.set(PDFName.of("Tabs"), PDFName.of("S"));
    const figure = context.register(
      context.obj({
        Alt: PDFHexString.fromText(meta.alt[i] ?? meta.title),
        K: 0,
        P: document,
        Pg: page.ref,
        S: "Figure",
        Type: "StructElem",
      })
    );
    figures.push(figure);
    nums.push(PDFNumber.of(i));
    nums.push(context.obj([figure]));
  });
  context.assign(
    document,
    context.obj({
      K: figures,
      Lang: PDFHexString.fromText(meta.lang),
      P: root,
      S: "Document",
      Type: "StructElem",
    })
  );
  context.assign(
    root,
    context.obj({
      K: document,
      ParentTree: context.obj({ Nums: nums }),
      ParentTreeNextKey: doc.getPageCount(),
      Type: "StructTreeRoot",
    })
  );
  catalog.set(PDFName.of("StructTreeRoot"), root);
};
