import { describe, expect, it } from "vitest";
import { IDLE_MINUTES, isIdle } from "@/components/diwan/idle-sign-out";

describe("the Diwan's inactivity timeout", () => {
  const now = Date.UTC(2026, 10, 7, 12);
  it("signs out after an hour without use (NIST SP 800-63B-4, AAL2)", () => {
    expect(IDLE_MINUTES).toBe(60);
    expect(isIdle(now - 61 * 60_000, now, IDLE_MINUTES)).toBe(true);
    expect(isIdle(now - 59 * 60_000, now, IDLE_MINUTES)).toBe(false);
  });
});
