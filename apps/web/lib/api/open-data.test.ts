import { describe, expect, test } from "vitest";
import { isDataset, toCsv } from "./open-data";

describe("open data", () => {
  test("CSV quotes what needs quoting", () => {
    expect(
      toCsv([
        { name: "A reading, with tea", tier: 1 },
        { name: "The “Paper”", tier: null },
      ])
    ).toBe('name,tier\r\n"A reading, with tea",1\r\nThe “Paper”,');
  });
  test("only the listed datasets are served", () => {
    expect(isDataset("events")).toBe(true);
    expect(isDataset("members")).toBe(false);
  });
});
