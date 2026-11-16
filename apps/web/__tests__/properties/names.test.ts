import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  namesInLine,
  tidyEnglishName,
  typedName,
  wordsInLine,
} from "@/lib/data/names";

/**
 * Property tests (fuzzing) for the official name's line: whatever is typed
 * or pasted, the line stays in its own script and no word is lost
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

  it("joins words into names without losing one", () => {
    fc.assert(
      fc.property(
        fc.string({ unit: "grapheme" }),
        language,
        fc.uniqueArray(fc.nat(8)),
        (value, lang, gaps) => {
          const typed = typedName(value, lang);
          const names = namesInLine(typed, lang, new Set(gaps));
          expect(names.join(" ")).toBe(wordsInLine(typed).join(" "));
        }
      )
    );
  });
});
