// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/env", () => ({
  env: {
    CRON_SECRET: "c".repeat(40),
    NEXT_PUBLIC_SITE_URL: "https://auibsal.org",
    TELEGRAM_BOT_TOKEN: "123:abc",
    TELEGRAM_BOT_USERNAME: "sal_test_bot",
    TELEGRAM_WEBHOOK_SECRET: "s".repeat(32),
  },
}));
vi.mock("@/lib/auth/verify", () => ({ authenticateRequest: async () => null }));

/** A Telegram that never answers, until the call's own signal gives up. */
const hung = (...args: unknown[]) => {
  const signal = args.at(-1) as AbortSignal | undefined;
  return new Promise((_, reject) => {
    signal?.addEventListener("abort", () => reject(signal.reason));
  });
};
vi.mock("@/lib/api/bot/bot", () => ({
  allowedUpdates: ["message"],
  sharedBot: () => ({
    api: {
      getWebhookInfo: hung,
      setMyCommands: hung,
      setMyDescription: hung,
      setMyShortDescription: hung,
      setWebhook: hung,
    },
  }),
}));
vi.mock("@/lib/api/bot/membership", async () => ({
  ...(await vi.importActual<object>("@/lib/api/bot/membership")),
  TELEGRAM_TIMEOUT_MS: 50,
  telegramSignal: (ms = 50) => AbortSignal.timeout(Math.min(ms, 50)),
}));

const { POST } = await import("@/app/api/telegram/setup/route");

const call = (connect: boolean) =>
  POST(
    new Request("https://api.example/telegram/setup", {
      body: JSON.stringify({ connect }),
      headers: {
        authorization: `Bearer ${"c".repeat(40)}`,
        "content-type": "application/json",
      },
      method: "POST",
    })
  );

describe("POST /telegram/setup with Telegram not answering", () => {
  it("the status check ends in a clear answer, inside the limit", async () => {
    const started = Date.now();
    const response = await call(false);
    expect(Date.now() - started).toBeLessThan(2000);
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ error: "telegram_timeout" });
  });

  it("connecting names every step that failed", async () => {
    const response = await call(true);
    expect(response.status).toBe(502);
    const body = (await response.json()) as { failed: string[] };
    expect(body.failed).toContain("webhook");
    expect(body.failed).toContain("commands.private.ar");
  });
});
