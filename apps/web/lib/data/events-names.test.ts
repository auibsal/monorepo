import { describe, expect, it } from "vitest";
import { asksForName } from "./events";

describe("asksForName", () => {
  it("finds a question asking for a name, in either language", () => {
    expect(asksForName({ id: "q1", label_en: "Your full name" })).toBe(true);
    expect(asksForName({ id: "name" })).toBe(true);
    expect(asksForName({ id: "q2", label_ar: "الاسم الكامل" })).toBe(true);
  });

  it("leaves other questions to be typed", () => {
    expect(asksForName({ id: "q3", label_en: "Dietary needs" })).toBe(false);
    expect(asksForName({ id: "q4", label_en: "Username on Goodreads" })).toBe(
      false
    );
  });
});
