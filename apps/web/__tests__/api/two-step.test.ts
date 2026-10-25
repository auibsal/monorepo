// @vitest-environment node
import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
process.env.SKIP_ENV_VALIDATION = "true";
process.env.SUPABASE_SECRET_KEY = "test-secret";

const CODE = /^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){2}$/;

const { hashRecoveryCode, newRecoveryCode, normalizeRecoveryCode } =
  await import("@/lib/api/two-step");

describe("recovery codes", () => {
  test("look like K4M9-X7QP-2AB8, in a script that can't be misread", () => {
    const codes = Array.from({ length: 200 }, newRecoveryCode);
    for (const code of codes) {
      expect(code).toMatch(CODE);
    }
    expect(new Set(codes).size).toBe(codes.length);
  });

  test("match however they are typed", () => {
    const code = "K4M9-X7QP-2AB0";
    expect(normalizeRecoveryCode(" k4m9 x7qp 2abo ")).toBe("K4M9X7QP2AB0");
    expect(hashRecoveryCode("k4m9x7qp2abo")).toBe(hashRecoveryCode(code));
    expect(hashRecoveryCode("K4M9-X7QP-2AB1")).not.toBe(hashRecoveryCode(code));
  });

  test("are stored as a keyed hash, never as typed", () => {
    const code = newRecoveryCode();
    const hash = hashRecoveryCode(code);
    expect(hash).not.toContain(normalizeRecoveryCode(code));
    process.env.SUPABASE_SECRET_KEY = "another-secret";
    expect(hashRecoveryCode(code)).not.toBe(hash);
    process.env.SUPABASE_SECRET_KEY = "test-secret";
  });
});
