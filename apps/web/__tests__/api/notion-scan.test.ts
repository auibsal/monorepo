// @vitest-environment node
import { readFile } from "node:fs/promises";
import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { findIn, mask } = await import("@/lib/api/notion/scan");
const { TERMS_TO_CHECK } = await import("@/lib/data/retired-names");

describe("the weekly scan of Notion's documents (Nov 16, 2026)", () => {
  test("finds retired names, terms to check and personal data", () => {
    const hits = findIn(
      "The Listening Room met. A themed call is open. Write to sara.ali@auib.edu.iq or 0770 123 4567; card 1241295. Signed, Sara Ali Hassan.",
      ["Sara Ali Hassan"]
    );
    expect(hits).toEqual(
      expect.arrayContaining([
        { found: "Listening Room", kind: "retired_name" },
        { found: "themed call", kind: "term" },
        { found: "s…@auib.edu.iq", kind: "personal_data" },
        { found: "…67", kind: "personal_data" },
        { found: "…95", kind: "personal_data" },
        {
          found: "a name in the Register (S. A. H.)",
          kind: "personal_data",
        },
      ])
    );
  });

  test("a clean page has nothing; dates and article numbers are not IDs", () => {
    expect(
      findIn("Adopted on 2026-11-07 under Article 12, section 3.", [])
    ).toEqual([]);
  });

  test("what is found is masked", () => {
    expect(mask("hello@auibsal.org")).toBe("h…@auibsal.org");
    expect(mask("07701234567")).toBe("…67");
  });

  test("the terms are the ones in docs/platform/terms-to-check.md", async () => {
    const page = await readFile(
      new URL("../../../../docs/platform/terms-to-check.md", import.meta.url),
      "utf8"
    );
    const listed = [...page.matchAll(/^- (.+)$/gmu)]
      .map((m) => m[1] ?? "")
      .filter((line) => !line.includes(" "))
      .concat(
        [...page.matchAll(/^- (.+)$/gmu)]
          .map((m) => m[1] ?? "")
          .filter((line) => line.includes(" "))
      );
    for (const term of TERMS_TO_CHECK) {
      expect(listed).toContain(term);
    }
  });
});
