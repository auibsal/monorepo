// @vitest-environment node
import { describe, expect, test } from "vitest";
import { problem, respond } from "@/lib/api/problem";

describe("one error shape (RFC 9457)", () => {
  test("a problem carries its status, title and the route's code", async () => {
    const response = problem(429, "rate_limited", { Vary: "Origin" });
    expect(response.status).toBe(429);
    expect(response.headers.get("content-type")).toBe(
      "application/problem+json"
    );
    expect(response.headers.get("vary")).toBe("Origin");
    expect(await response.json()).toEqual({
      error: "rate_limited",
      status: 429,
      title: "Too Many Requests",
      type: "about:blank",
    });
  });

  test("a route's replies: errors as problems, the rest as JSON", async () => {
    const json = respond({ "X-Test": "1" });
    const ok = json({ sent: true });
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toContain("application/json");
    expect(await ok.json()).toEqual({ sent: true });

    const refused = json({ error: "invalid_request" }, 400);
    expect(refused.headers.get("content-type")).toBe(
      "application/problem+json"
    );
    expect(refused.headers.get("x-test")).toBe("1");
    expect((await refused.json()).error).toBe("invalid_request");
  });
});
