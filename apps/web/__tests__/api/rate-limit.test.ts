// @vitest-environment node
import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { fromCloudflare, visitorOf } = await import("@/lib/api/rate-limit");

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
