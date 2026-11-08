// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

const getClaims = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("./keys", () => ({
  keys: () => ({
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  }),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { getClaims } }),
}));

const { authenticateRequest, signedInWithin } = await import("./verify");

const request = () =>
  new Request("https://auibsal.org/api/x", {
    headers: { authorization: "Bearer token" },
  });

describe("authenticateRequest", () => {
  beforeEach(() => getClaims.mockReset());

  test("accepts the Society's own tokens", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    const session = await authenticateRequest(request());
    expect(session?.userId).toBe("u1");
  });

  test("turns away third-party app tokens", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { client_id: "app-1", sub: "u1" } },
      error: null,
    });
    expect(await authenticateRequest(request())).toBeNull();
  });

  test("rejects a missing or invalid token", async () => {
    expect(
      await authenticateRequest(new Request("https://auibsal.org/api/x"))
    ).toBeNull();
    getClaims.mockResolvedValue({ data: null, error: new Error("bad") });
    expect(await authenticateRequest(request())).toBeNull();
  });
});

describe("signedInWithin", () => {
  const now = Date.UTC(2026, 10, 7, 12, 0, 0);
  const at = (minutesAgo: number) => (now - minutesAgo * 60_000) / 1000;

  test("a sign-in a few minutes ago is fresh", () => {
    expect(
      signedInWithin(
        { amr: [{ method: "password", timestamp: at(3) }] },
        15,
        now
      )
    ).toBe(true);
  });

  test("the latest step counts (two-step after an old password)", () => {
    expect(
      signedInWithin(
        {
          amr: [
            { method: "password", timestamp: at(600) },
            { method: "totp", timestamp: at(5) },
          ],
        },
        15,
        now
      )
    ).toBe(true);
  });

  test("an old sign-in, or none, is not", () => {
    expect(
      signedInWithin({ amr: [{ method: "otp", timestamp: at(60) }] }, 15, now)
    ).toBe(false);
    expect(signedInWithin({}, 15, now)).toBe(false);
  });
});
