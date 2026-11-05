import { describe, expect, it } from "vitest";
import { ORIGINAL_LANGUAGES, textDirection } from "./journal";

describe("an original's direction", () => {
  it("is right to left for the Arabic-script and Hebrew languages", () => {
    expect(textDirection("ar")).toBe("rtl");
    expect(textDirection("fa")).toBe("rtl");
    expect(textDirection("ckb")).toBe("rtl");
    expect(textDirection("syr")).toBe("rtl");
    expect(textDirection("fr")).toBe("ltr");
    expect(textDirection("ku")).toBe("ltr");
  });

  it("offers only codes the database accepts", () => {
    for (const code of ORIGINAL_LANGUAGES) {
      expect(code).toMatch(/^[a-z]{2,3}$/);
    }
  });
});
