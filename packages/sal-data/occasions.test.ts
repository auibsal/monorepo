import { describe, expect, it } from "vitest";
import { OCCASIONS } from "./events";

describe("occasions", () => {
  it("are the trip and the contest, each an ordinary event (owner, Nov 5, 2026)", () => {
    expect(OCCASIONS).toEqual(["book_street_trip", "worst_poem_contest"]);
  });
});
