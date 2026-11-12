// @vitest-environment node
import { samples } from "@repo/email/samples";
import { describe, expect, test } from "vitest";

/** Storybook names an export "AgreementReminder" "Agreement Reminder". */
const storyName = (key: string) => key.replace(/([a-z0-9])([A-Z])/gu, "$1 $2");

describe("the design page's email samples", () => {
  test("every sample builds in both languages", () => {
    for (const make of Object.values(samples)) {
      for (const lang of ["en", "ar"] as const) {
        const built = make(lang);
        expect(built.subject.length).toBeGreaterThan(0);
        expect(built.blocks[0]?.lang).toBe(lang);
      }
    }
  });

  test("each entry's name leads back to its sample", () => {
    for (const key of Object.keys(samples)) {
      expect(Object.hasOwn(samples, storyName(key).replaceAll(" ", ""))).toBe(
        true
      );
    }
  });
});
