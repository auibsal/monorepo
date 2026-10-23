// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const env = vi.hoisted(() => ({
  NEXT_PUBLIC_APP_URL: "https://nexus.example",
  NEXT_PUBLIC_WEB_URL: "https://web.example",
  TELEGRAM_BOT_TOKEN: undefined as string | undefined,
  TELEGRAM_LOGIN_CLIENT_SECRET: undefined as string | undefined,
}));
vi.mock("@/env", () => ({ env }));
vi.mock("@repo/auth/verify", () => ({
  authenticateRequest: async (request: Request) =>
    request.headers.get("authorization") ? { userId: "u1" } : null,
}));

const { POST } = await import("@/app/telegram/link/route");

const start = {
  codeChallenge: "c".repeat(43),
  redirectUri: "https://nexus.example/ar/profile",
  state: "s".repeat(20),
};

const call = (body: object, signedIn = true) =>
  POST(
    new Request("https://api.example/telegram/link", {
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        ...(signedIn ? { authorization: "Bearer t" } : {}),
      },
      method: "POST",
    })
  );

describe("POST /telegram/link", () => {
  it("is for signed-in members only", async () => {
    expect((await call(start, false)).status).toBe(401);
  });

  it.each([
    "https://evil.example/profile",
    "https://nexus.example/events",
    "https://nexus.example/profile?next=x",
  ])(
    "sends Telegram back only to the Nexus profile, not %s",
    async (redirectUri) => {
      expect((await call({ ...start, redirectUri })).status).toBe(400);
    }
  );

  it("answers no address until the login is set up", async () => {
    expect(await (await call(start)).json()).toEqual({ url: null });
  });

  it("answers Telegram's address with the bot as the client", async () => {
    env.TELEGRAM_BOT_TOKEN = `8506082400:${"a".repeat(35)}`;
    env.TELEGRAM_LOGIN_CLIENT_SECRET = "s".repeat(32);
    const { url } = (await (await call(start)).json()) as { url: string };
    const address = new URL(url);
    expect(address.host).toBe("oauth.telegram.org");
    expect(address.searchParams.get("client_id")).toBe("8506082400");
    expect(address.searchParams.get("redirect_uri")).toBe(start.redirectUri);
    expect(address.searchParams.get("state")).toBe(start.state);
  });
});
