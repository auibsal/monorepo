import { describe, expect, it } from "vitest";
import { IDLE_MINUTES, isIdle } from "@/components/diwan/idle-sign-out";

describe("the Diwan's inactivity timeout", () => {
  const now = Date.UTC(2026, 10, 7, 12);
  it("signs out after thirty minutes without use (decisions §11)", () => {
    expect(IDLE_MINUTES).toBe(30);
    expect(isIdle(now - 31 * 60_000, now, IDLE_MINUTES)).toBe(true);
    expect(isIdle(now - 29 * 60_000, now, IDLE_MINUTES)).toBe(false);
  });
});
