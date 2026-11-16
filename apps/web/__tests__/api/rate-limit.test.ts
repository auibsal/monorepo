// @vitest-environment node
import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const rpc = vi.fn();
const SHA256_HEX = /^[0-9a-f]{64}$/u;
vi.mock("@repo/database/admin", () => ({
  createAdminClient: () => ({ schema: () => ({ rpc }) }),
}));
vi.mock("@/lib/observability/log", () => ({ log: { warn: vi.fn() } }));

const { fromCloudflare, visitorOf, withinRateLimit } = await import(
  "@/lib/api/rate-limit"
);

const request = (headers: Record<string, string>) =>
  new Request("https://auibsal.org/api/x", { headers });

describe("the visitor's address", () => {
  test("Cloudflare's edges are recognized, others are not", () => {
    expect(fromCloudflare("172.70.1.2")).toBe(true);
    expect(fromCloudflare("2606:4700::1")).toBe(true);
    expect(fromCloudflare("8.8.8.8")).toBe(false);
    expect(fromCloudflare("not an address")).toBe(false);
  });

  test("through Cloudflare, the visitor is CF-Connecting-IP", () => {
    expect(
      visitorOf(
        request({ "cf-connecting-ip": "37.237.1.1", "x-real-ip": "172.70.1.2" })
      )
    ).toBe("37.237.1.1");
  });

  test("a direct request can't choose its address with CF-Connecting-IP", () => {
    expect(
      visitorOf(
        request({ "cf-connecting-ip": "1.2.3.4", "x-real-ip": "37.237.9.9" })
      )
    ).toBe("37.237.9.9");
  });

  test("Vercel's forwarded header is the fallback", () => {
    expect(
      visitorOf(request({ "x-vercel-forwarded-for": "37.237.5.5, 10.0.0.1" }))
    ).toBe("37.237.5.5");
  });
});

describe("the database's count", () => {
  const visitor = request({ "x-real-ip": "37.237.9.9" });

  test("takes one more request while the count allows it", async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null });
    expect(await withinRateLimit(visitor, "form", { max: 3 })).toBe(true);
    expect(rpc).toHaveBeenLastCalledWith(
      "take_rate",
      expect.objectContaining({ max_hits: 3, window_seconds: 600 })
    );
    rpc.mockResolvedValueOnce({ data: false, error: null });
    expect(await withinRateLimit(visitor, "form")).toBe(false);
  });

  test("counts a hash, never the address itself", async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null });
    await withinRateLimit(visitor, "form");
    const args = rpc.mock.lastCall?.[1] as { bucket: string } | undefined;
    const bucket = args?.bucket ?? "";
    expect(bucket).toMatch(SHA256_HEX);
    expect(bucket).not.toContain("37.237");
  });

  test("goes on when the count can't be read, except near sign-in", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "down" } });
    expect(await withinRateLimit(visitor, "form")).toBe(true);
    expect(await withinRateLimit(visitor, "code", { failClosed: true })).toBe(
      false
    );
    rpc.mockReset();
  });
});
