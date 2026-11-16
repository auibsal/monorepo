import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { pickMessages } from "@/lib/i18n/account-messages";
import { breachedIn } from "@/lib/password";

const SUFFIX = /^[0-9A-F]{35}$/u;
const KEY = /^[a-z]{1,6}$/u;

/** Property tests (fuzzing) for what the site reads from outside. */
describe("reading what comes from outside", () => {
  it("finds a breached password's suffix in any range response", () => {
    const suffix = fc.stringMatching(SUFFIX);
    fc.assert(
      fc.property(
        fc.array(fc.tuple(suffix, fc.nat()), { maxLength: 30 }),
        suffix,
        fc.integer({ max: 10_000, min: 1 }),
        (lines, wanted, count) => {
          const others = lines.filter(([line]) => line !== wanted);
          const range = [...others, [wanted, count] as const]
            .map(([line, n]) => `${line}:${n}`)
            .join("\r\n");
          expect(breachedIn(range, wanted)).toBe(true);
          expect(
            breachedIn(
              others.map(([line, n]) => `${line}:${n}`).join("\n"),
              wanted
            )
          ).toBe(false);
        }
      )
    );
  });

  it("picks each listed part of a messages tree whole", () => {
    const key = fc.stringMatching(KEY);
    fc.assert(
      fc.property(
        fc.dictionary(key, fc.dictionary(key, fc.string())),
        (tree) => {
          const keys = Object.keys(tree);
          expect(pickMessages(tree, keys)).toEqual(tree);
          for (const top of keys) {
            for (const inner of Object.keys(tree[top] ?? {})) {
              expect(pickMessages(tree, [`${top}.${inner}`])).toEqual({
                [top]: { [inner]: tree[top]?.[inner] },
              });
            }
          }
        }
      )
    );
  });
});
