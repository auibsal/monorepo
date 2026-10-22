// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/env", () => ({
  env: { CRON_SECRET: "c".repeat(40), TELEGRAM_BOT_USERNAME: "sal_test_bot" },
}));
vi.mock("@repo/auth/verify", () => ({ authenticateRequest: async () => null }));

const { POST } = await import("@/app/telegram/setup/route");

const call = (headers: Record<string, string>) =>
  POST(
    new Request("https://api.example/telegram/setup", {
      body: "{}",
      headers: { "content-type": "application/json", ...headers },
      method: "POST",
    })
  );

describe("POST /telegram/setup", () => {
  it("refuses callers who are neither signed in nor the cron", async () => {
    expect((await call({})).status).toBe(401);
  });

  it("says what is missing before the bot is set up", async () => {
    const response = await call({ authorization: `Bearer ${"c".repeat(40)}` });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      configured: false,
      missing: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET"],
    });
  });
});
