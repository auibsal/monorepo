// @vitest-environment node
import { describe, expect, test } from "vitest";
import { greetingFor } from "@/components/nexus/home/member-home";

// Baghdad is UTC+3 all year.
const baghdad = (iso: string) => new Date(`${iso}+03:00`);

describe("the Today greeting", () => {
  test("follows the time of day in Baghdad", () => {
    // Sunday, October 25, 2026.
    expect(greetingFor(baghdad("2026-10-25T08:00:00"))).toBe("morning");
    expect(greetingFor(baghdad("2026-10-25T14:00:00"))).toBe("afternoon");
    expect(greetingFor(baghdad("2026-10-25T19:30:00"))).toBe("evening");
    expect(greetingFor(baghdad("2026-10-25T02:00:00"))).toBe("late");
  });

  test("says Happy Friday until the evening", () => {
    // Friday, October 30, 2026.
    expect(greetingFor(baghdad("2026-10-30T09:00:00"))).toBe("friday");
    expect(greetingFor(baghdad("2026-10-30T20:00:00"))).toBe("evening");
  });

  test("uses Baghdad's day, not the server's", () => {
    // 22:00 UTC on Thursday is 01:00 Friday in Baghdad: still late night.
    expect(greetingFor(new Date("2026-10-29T22:00:00Z"))).toBe("late");
    // 03:00 UTC on Friday is 06:00 Friday in Baghdad.
    expect(greetingFor(new Date("2026-10-30T03:00:00Z"))).toBe("friday");
  });
});
