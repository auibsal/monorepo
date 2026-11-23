import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { tidyEnglishName, typedName } from "@/lib/data/names";

/**
 * Property tests (fuzzing) for a name as typed: whatever is typed
 * or pasted, the line stays in its own script
 * (decisions.md, Members; AGENTS.md, Accounts).
 */
const language = fc.constantFrom("en" as const, "ar" as const);
const ARABIC = /[؀-ۿ]/u;
const LATIN = /[A-Za-z]/u;
const DIGIT = /[0-9٠-٩]/u;
const UNTIDY = /\s{2}|-{2}|^[\s-]/u;

describe("typing a name, whatever is typed", () => {
  it("keeps only the line's own letters, spaces and hyphens", () => {
    fc.assert(
      fc.property(fc.string({ unit: "grapheme" }), language, (value, lang) => {
        const typed = typedName(value, lang);
        expect(DIGIT.test(typed)).toBe(false);
        expect((lang === "en" ? ARABIC : LATIN).test(typed)).toBe(false);
        expect(typed).not.toMatch(UNTIDY);
      })
    );
  });

  it("is settled after one pass", () => {
    fc.assert(
      fc.property(fc.string({ unit: "grapheme" }), language, (value, lang) => {
        const typed = typedName(value, lang);
        expect(typedName(typed, lang)).toBe(typed);
      })
    );
  });

  it("capitalizes English once and for all", () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        const tidy = tidyEnglishName(typedName(value, "en"));
        expect(tidyEnglishName(tidy)).toBe(tidy);
      })
    );
  });
});
