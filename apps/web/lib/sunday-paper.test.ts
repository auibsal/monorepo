import { describe, expect, test } from "vitest";
import { issueOf, issuesSince } from "./sunday-paper";

describe("the Sunday Paper's issues", () => {
  test("November 2026's is Sunday, November 1, Baghdad midnight", () => {
    const issue = issueOf(2026, 10);
    expect(issue.key).toBe("2026-11");
    expect(issue.sunday.toISOString()).toBe("2026-10-31T21:00:00.000Z");
    expect(issue.piecesFrom.toISOString()).toBe("2026-09-30T21:00:00.000Z");
    expect(issue.until.toISOString()).toBe("2026-11-30T21:00:00.000Z");
  });

  test("December 2026's is Sunday, December 6", () => {
    expect(issueOf(2026, 11).sunday.toISOString()).toBe(
      "2026-12-05T21:00:00.000Z"
    );
  });

  test("only issues already sent, newest first", () => {
    const keys = issuesSince(
      new Date("2026-10-09T00:00:00Z"),
      new Date("2026-12-10T00:00:00Z")
    ).map((i) => i.key);
    expect(keys).toEqual(["2026-12", "2026-11", "2026-10"]);
  });
});
