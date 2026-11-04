import { expect, test } from "vitest";
import { sanitizeRichText, toPlainText, withNotes } from "./sanitize";

const UNSAFE = /script|onclick|javascript|iframe/;

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
