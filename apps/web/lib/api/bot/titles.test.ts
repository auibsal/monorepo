import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { shortTitle } = await import("./titles");

describe("a seat as a Telegram title (16 characters at most)", () => {
  test("a short seat stays whole", () => {
    expect(shortTitle("President")).toBe("President");
    expect(shortTitle("Editor-in-Chief")).toBe("Editor-in-Chief");
  });

  test("a long seat is cut at a word", () => {
    expect(shortTitle("Director of Partnerships")).toBe("Director");
    expect(shortTitle("Director of Partnerships").length).toBeLessThanOrEqual(
      16
    );
  });

  test("a single long word is cut at 16", () => {
    expect(shortTitle("Supercalifragilistic")).toHaveLength(16);
  });
});
