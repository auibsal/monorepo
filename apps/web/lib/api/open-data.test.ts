import { describe, expect, test } from "vitest";
import { DATASETS, isDataset, readDataset, toCsv } from "./open-data";

describe("open data", () => {
  test("CSV quotes what needs quoting", () => {
    expect(
      toCsv([
        { name: "A reading, with tea", tier: 1 },
        { name: "The “Paper”", tier: null },
      ])
    ).toBe('name,tier\r\n"A reading, with tea",1\r\nThe “Paper”,');
  });
  test("each dataset reads its public rows", async () => {
    const rows = [{ key: "a", tier: "1" }];
    const query = {
      eq: () => query,
      neq: () => query,
      order: () => Promise.resolve({ data: rows }),
      select: () => query,
    };
    const api = {
      from: () => query,
      rpc: () => Promise.resolve({ data: rows }),
    };
    const admin = { schema: () => api } as unknown as Parameters<
      typeof readDataset
    >[0];
    const read = await Promise.all(
      DATASETS.map((dataset) => readDataset(admin, dataset))
    );
    for (const found of read) {
      expect(found).toEqual(rows);
    }
  });
  test("only the listed datasets are served", () => {
    expect(isDataset("events")).toBe(true);
    expect(isDataset("members")).toBe(false);
  });
});
