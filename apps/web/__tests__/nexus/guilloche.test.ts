import { describe, expect, test } from "vitest";
import { guillochePaths } from "@/components/nexus/home/guilloche";

describe("the card's line pattern", () => {
  test("is the same every time for a card", () => {
    expect(guillochePaths(42)).toEqual(guillochePaths(42));
  });

  test("differs from card to card", () => {
    expect(guillochePaths(42)).not.toEqual(guillochePaths(43));
  });

  test("stays light enough to draw on a phone", () => {
    const size = guillochePaths(7).join("").length;
    expect(size).toBeLessThan(160_000);
  });
});
