import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { membersDescription } = await import("./upkeep");

describe("the members' group's description", () => {
  test("without an event, the line decisions.md gives", () => {
    expect(membersDescription(null)).toBe(
      "The paper and the pen at @AUIB_BAG. Events: auibsal.org/events · Join: auibsal.org/join"
    );
  });

  test("with the next event, its title, time and page", () => {
    const text = membersDescription({
      slug: "open-mic",
      starts_at: "2026-11-18T15:00:00Z",
      title_en: "Open Mic",
    });
    expect(text).toContain("Next: Open Mic, Wednesday, November 18, 6:00 p.m.");
    expect(text).toContain("auibsal.org/events/open-mic");
  });

  test("a long title is cut so the whole stays within Telegram's 255", () => {
    const text = membersDescription({
      slug: "long",
      starts_at: "2026-11-18T15:00:00Z",
      title_en: "A".repeat(400),
    });
    expect(text.length).toBeLessThanOrEqual(255);
    expect(text).toContain("…");
  });
});
