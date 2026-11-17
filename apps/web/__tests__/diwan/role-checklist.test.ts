import { describe, expect, test } from "vitest";
import { STEP_PAGES } from "@/components/diwan/home/role-checklist";

describe("the first steps' buttons", () => {
  test("the declaration goes straight to its form", () => {
    expect(STEP_PAGES.declaration?.("a1")).toBe(
      "/account/settings/disclosures/declare"
    );
  });
  test("the manual and Brand essentials open their own pages", () => {
    expect(STEP_PAGES.manual?.("a1")).toBe("/diwan/manual/a1");
    expect(STEP_PAGES.brand?.("a1")).toBe("/diwan/media/design");
  });
});
