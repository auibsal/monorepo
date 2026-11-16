// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

const allowed = { value: true };
const warn = vi.fn();

vi.mock("@/lib/api/rate-limit", () => ({
  withinRateLimit: vi.fn(async () => allowed.value),
}));
vi.mock("@/lib/observability/log", () => ({ log: { warn } }));

const { POST } = await import("@/app/api/csp-report/route");

const report = (body: string) =>
  POST(
    new Request("https://auibsal.org/api/csp-report", {
      body,
      headers: { "content-type": "application/reports+json" },
      method: "POST",
    })
  );

const violation = JSON.stringify([
  {
    body: {
      blockedURL: "https://tags.example/gtm.js?id=X",
      documentURL: "https://auibsal.org/?ref=1",
      effectiveDirective: "script-src-elem",
    },
    type: "csp-violation",
  },
]);

describe("the CSP report address", () => {
  beforeEach(() => {
    allowed.value = true;
    warn.mockClear();
  });

  test("logs each blocked resource without its query", async () => {
    const response = await report(violation);
    expect(response.status).toBe(204);
    expect(warn).toHaveBeenCalledWith(
      "Content Security Policy blocked",
      expect.objectContaining({
        blocked: "https://tags.example/gtm.js",
        page: "https://auibsal.org/",
      })
    );
  });

  test("answers 204 and logs nothing past the limit, when empty or malformed", async () => {
    allowed.value = false;
    expect((await report(violation)).status).toBe(204);
    allowed.value = true;
    expect((await report("")).status).toBe(204);
    expect((await report("{not json")).status).toBe(204);
    expect((await report("x".repeat(20_000))).status).toBe(204);
    expect(warn).not.toHaveBeenCalled();
  });
});
