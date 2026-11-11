import { describe, expect, test } from "vitest";
import { chaptersOf, clockOf, secondsOf } from "./programmes";

describe("Next Stop's chapters", () => {
  test("times read and write both ways", () => {
    expect(clockOf(65)).toBe("1:05");
    expect(clockOf(3725)).toBe("1:02:05");
    expect(secondsOf("1:05")).toBe(65);
    expect(secondsOf("1:02:05")).toBe(3725);
    expect(secondsOf("five")).toBeNull();
    expect(secondsOf("90")).toBeNull();
  });

  test("chapters come in time order, and malformed ones are left out", () => {
    expect(
      chaptersOf([
        { at: 120, title_ar: "«الرحلة»", title_en: "The ride" },
        { at: 0, title_ar: "الافتتاحية", title_en: "Cold open" },
        { at: "x", title_en: "Broken" },
      ]).map((c) => c.at)
    ).toEqual([0, 120]);
    expect(chaptersOf(null)).toEqual([]);
  });
});
