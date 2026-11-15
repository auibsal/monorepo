import { describe, expect, it, vi } from "vitest";
import { sundayText } from "./feeds";

vi.mock("server-only", () => ({}));

const EVENT_LINE =
  /• <a href="[^"]*\/events\/writing-workshop">Writing workshop<\/a>, /u;
const CALL_LINE =
  /• <a href="[^"]*\/qirtas\/editions\/haven">Haven: dreams and memories<\/a>, closes Sunday, December 6/u;

describe("Hudhud's Sunday note", () => {
  it("lists the week's events and the open calls, each linking to its own page", () => {
    const text = sundayText(
      "en",
      [
        {
          slug: "writing-workshop",
          starts_at: "2026-11-17T15:00:00Z",
          title_ar: null,
          title_en: "Writing workshop",
        },
      ] as never,
      [
        {
          closes_at: "2026-12-06T20:59:00Z",
          edition_slug: "haven",
          title_ar: null,
          title_en: "Haven: dreams and memories",
        },
      ] as never
    );
    expect(text).toContain("<b>This week at SAL</b>");
    expect(text).toMatch(EVENT_LINE);
    expect(text).toContain("<b>Open calls</b>");
    expect(text).toMatch(CALL_LINE);
  });

  it("leaves out a part with nothing in it", () => {
    const text = sundayText("en", [], [
      {
        closes_at: "2026-12-06T20:59:00Z",
        edition_slug: "haven",
        title_ar: null,
        title_en: "Haven",
      },
    ] as never);
    expect(text).not.toContain("Events");
  });
});
