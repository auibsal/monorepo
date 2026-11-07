import { describe, expect, test } from "vitest";
import { issueOf, nextIssue } from "./sunday-paper";

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

  test("the next issue after November 1, 2026 is December 6", () => {
    expect(nextIssue(new Date("2026-11-07T12:00:00Z")).key).toBe("2026-12");
    expect(nextIssue(new Date("2026-11-30T12:00:00Z")).key).toBe("2026-12");
    expect(nextIssue(new Date("2026-12-20T12:00:00Z")).key).toBe("2027-01");
  });
});
