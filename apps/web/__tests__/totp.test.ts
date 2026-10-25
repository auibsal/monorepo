// @vitest-environment node
import { describe, expect, test } from "vitest";
import { totp, totpSecondsLeft, totpStep } from "@/lib/totp";

// RFC 6238, Appendix B: the SHA-1 seed "12345678901234567890".
const SEED = Buffer.from("12345678901234567890").toString("hex");

describe("the live card's code", () => {
  test("matches the RFC 6238 test vectors", async () => {
    expect(await totp(SEED, totpStep(59_000))).toBe("94287082");
    expect(await totp(SEED, totpStep(1_111_111_109_000))).toBe("07081804");
    expect(await totp(SEED, totpStep(2_000_000_000_000))).toBe("69279037");
  });

  test("changes every 30 seconds", () => {
    expect(totpStep(29_999)).toBe(0);
    expect(totpStep(30_000)).toBe(1);
    expect(totpSecondsLeft(31_000)).toBe(29);
  });
});
