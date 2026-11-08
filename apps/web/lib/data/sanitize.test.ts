import { expect, test } from "vitest";
import {
  sanitizeRichText,
  splitAtFigures,
  toPlainText,
  withContents,
  withNotes,
} from "./sanitize";

const UNSAFE = /script|onclick|javascript|iframe/u;

test("strips scripts, handlers and unsafe links", () => {
  const html = sanitizeRichText(
    '<p onclick="x()">Hi<script>alert(1)</script> <a href="javascript:alert(1)">x</a> <a href="https://auibsal.org">ok</a></p><iframe src="https://evil"></iframe>'
  );
  expect(html).not.toMatch(UNSAFE);
  expect(html).toContain(
    '<a href="https://auibsal.org" rel="noopener noreferrer nofollow">ok</a>'
  );
});

test("keeps direction attributes for bilingual text", () => {
  expect(sanitizeRichText('<p dir="rtl" lang="ar">ورق</p>')).toBe(
    '<p dir="rtl" lang="ar">ورق</p>'
  );
});

test("plain text for excerpts", () => {
  expect(toPlainText("<p>The paper</p>\n<p>and the pen</p>")).toBe(
    "The paper and the pen"
  );
});

test("keeps pull quotes and notes", () => {
  const html = sanitizeRichText(
    "<aside><p>A line worth repeating.</p></aside><p>Text<small>A note.</small></p>"
  );
  expect(html).toContain("<aside><p>A line worth repeating.</p></aside>");
  expect(html).toContain("<small>A note.</small>");
});

test("numbers notes and lists them after the text", () => {
  const { body, notes } = withNotes(
    '<p>One<small>First.</small> two<small lang="en">Second <em>note</em>.</small></p>',
    "en"
  );
  expect(body).toBe(
    '<p>One<sup id="en-ref-1"><a href="#en-note-1">1</a></sup> two<sup id="en-ref-2"><a href="#en-note-2">2</a></sup></p>'
  );
  expect(notes).toEqual([
    { html: "First.", id: "en-note-1", ref: "en-ref-1" },
    { html: "Second <em>note</em>.", id: "en-note-2", ref: "en-ref-2" },
  ]);
});

test("a long read's contents anchor each part's heading", () => {
  const { body, contents } = withContents(
    '<h2>One</h2><p>a</p><h2 dir="rtl">Two <em>parts</em></h2><h2></h2>',
    "en"
  );
  expect(contents).toEqual([
    { id: "en-part-1", text: "One" },
    { id: "en-part-2", text: "Two parts" },
  ]);
  expect(body).toContain('<h2 id="en-part-1">One</h2>');
  expect(body).toContain('<h2 id="en-part-2" dir="rtl">');
  expect(body).toContain("<h2></h2>");
});

test("text crafted with many unclosed tags is read in linear time", () => {
  const many = (open: string) => open.repeat(50_000);
  const started = performance.now();
  withNotes(many("<small "), "en");
  withNotes(many("<small>a"), "en");
  withContents(many("<h2 "), "en");
  withContents(many("<h2>a"), "en");
  splitAtFigures(many("<p "));
  expect(performance.now() - started).toBeLessThan(1000);
});

test("an unclosed tag is left as it is", () => {
  expect(withNotes("<p>One <small>two</p>", "en")).toEqual({
    body: "<p>One <small>two</p>",
    notes: [],
  });
  expect(withNotes("<smaller>x</smaller>", "en").notes).toEqual([]);
});
