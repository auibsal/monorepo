import { describe, expect, it } from "vitest";
import { OCCASIONS, occasionOf, occasionPath } from "./events";

describe("occasions", () => {
  it("each has a page under its program", () => {
    expect(occasionPath("book_street_trip")).toBe(
      "/events/book-circle/mutanabbi-street"
    );
    expect(occasionPath("worst_poem_contest")).toBe(
      "/events/open-pages/worst-poem"
    );
  });

  it("finds the occasion a program's page names, and nothing else", () => {
    expect(occasionOf("book-circle", "mutanabbi-street")).toBe(
      "book_street_trip"
    );
    expect(occasionOf("open-pages", "worst-poem")).toBe("worst_poem_contest");
    expect(occasionOf("open-pages", "mutanabbi-street")).toBeUndefined();
    expect(occasionOf("salon", "past")).toBeUndefined();
    expect(Object.keys(OCCASIONS)).toHaveLength(2);
  });
});
