import { describe, expect, it, vi } from "vitest";
import { sundayText } from "./feeds";

vi.mock("server-only", () => ({}));

describe("Hudhud's Sunday note", () => {
  it("lists the week's events and the open calls", () => {
    const text = sundayText(
      "en",
      [
        {
          starts_at: "2026-11-17T15:00:00Z",
          title_ar: null,
          title_en: "Writing workshop",
        },
      ] as never,
      [
        {
          closes_at: "2026-12-06T20:59:00Z",
          title_ar: null,
          title_en: "Haven",
        },
      ] as never
    );
    expect(text).toContain("<b>This week at SAL</b>");
    expect(text).toContain("• Writing workshop, ");
    expect(text).toContain("<b>Write for Qirtas</b>");
    expect(text).toContain("• Haven, closes Sunday, December 6");
  });

  it("leaves out a part with nothing in it", () => {
    const text = sundayText("en", [], [
      { closes_at: "2026-12-06T20:59:00Z", title_ar: null, title_en: "Haven" },
    ] as never);
    expect(text).not.toContain("Events");
  });
});
