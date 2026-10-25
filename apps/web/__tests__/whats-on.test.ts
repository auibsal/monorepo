// @vitest-environment node
import { formatMonth } from "@repo/internationalization/format";
import { describe, expect, test } from "vitest";
import {
  byDay,
  monthFrom,
  monthParam,
  monthWeeks,
  shiftMonth,
  weekdayColumns,
} from "@/lib/whats-on";

describe("What's on months", () => {
  test("a month starts and ends at Baghdad midnight", () => {
    const month = monthFrom("2026-11");
    expect(month.from.toISOString()).toBe("2026-10-31T21:00:00.000Z");
    expect(month.to.toISOString()).toBe("2026-11-30T21:00:00.000Z");
    expect(monthParam(month)).toBe("2026-11");
  });

  test("a bad or missing month is the current one in Baghdad", () => {
    // 22:30 UTC on Oct 31 is already November 1 in Baghdad.
    const now = new Date("2026-10-31T22:30:00Z");
    expect(monthParam(monthFrom(undefined, now))).toBe("2026-11");
    expect(monthParam(monthFrom("2026-13", now))).toBe("2026-11");
    expect(monthParam(monthFrom("nonsense", now))).toBe("2026-11");
  });

  test("months shift across the year", () => {
    const december = monthFrom("2026-12");
    expect(monthParam(shiftMonth(december, 1))).toBe("2027-01");
    expect(monthParam(shiftMonth(monthFrom("2026-01"), -1))).toBe("2025-12");
  });

  test("weeks start on Saturday and pad the month", () => {
    // November 1, 2026 is a Sunday: one empty Saturday before it.
    const weeks = monthWeeks(monthFrom("2026-11"));
    expect(weeks[0]?.[0]).toBeNull();
    expect(weeks[0]?.[1]).toBe("2026-11-01");
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
    expect(weekdayColumns()[0]?.getUTCDay()).toBe(6);
  });

  test("events fall on their Baghdad day", () => {
    const days = byDay([
      { id: "late", starts_at: "2026-11-01T22:00:00Z" },
      { id: "early", starts_at: "2026-11-01T08:00:00Z" },
    ]);
    expect(days.get("2026-11-02")?.map((row) => row.id)).toEqual(["late"]);
    expect(days.get("2026-11-01")?.map((row) => row.id)).toEqual(["early"]);
  });

  test("the month's name is in Baghdad time", () => {
    expect(formatMonth(monthFrom("2026-11").from, "en")).toBe("November 2026");
  });
});
