// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const allowed = { value: true };
const RANGE_URL = /range\/21BD1$/u;

vi.mock("@/lib/api/rate-limit", () => ({
  withinRateLimit: vi.fn(async () => allowed.value),
}));

const { GET } = await import("@/app/api/password-check/route");

const check = (prefix: string) =>
  GET(new Request(`https://auibsal.org/api/password-check?prefix=${prefix}`));

describe("the breached-password check", () => {
  const upstream = vi.fn();

  beforeEach(() => {
    allowed.value = true;
    upstream.mockReset();
    vi.stubGlobal("fetch", upstream);
  });
  afterEach(() => vi.unstubAllGlobals());

  test("passes the range for a five-character prefix", async () => {
    upstream.mockResolvedValue(
      new Response("0018A45C4D1DEF81644B54AB7F969B88D65:1")
    );
    const response = await check("21bd1");
    expect(response.status).toBe(200);
    expect(await response.text()).toContain(
      "0018A45C4D1DEF81644B54AB7F969B88D65"
    );
    expect(String(upstream.mock.calls[0]?.[0])).toMatch(RANGE_URL);
  });

  test("refuses anything else, and past the limit", async () => {
    expect((await check("21bd")).status).toBe(400);
    allowed.value = false;
    expect((await check("21BD1")).status).toBe(429);
    expect(upstream).not.toHaveBeenCalled();
  });

  test("says unavailable when the breach list can't be reached", async () => {
    upstream.mockRejectedValue(new Error("offline"));
    expect((await check("21BD1")).status).toBe(503);
  });
});
