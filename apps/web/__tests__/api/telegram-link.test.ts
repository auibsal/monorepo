// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const env = vi.hoisted(() => ({
  NEXT_PUBLIC_SITE_URL: "https://site.example",
  TELEGRAM_BOT_TOKEN: undefined as string | undefined,
  TELEGRAM_LOGIN_CLIENT_SECRET: undefined as string | undefined,
}));
vi.mock("@/env", () => ({ env }));
vi.mock("@/lib/auth/verify", () => ({
  authenticateRequest: async (request: Request) =>
    request.headers.get("authorization") ? { userId: "u1" } : null,
}));

const { POST } = await import("@/app/api/telegram/link/route");

const start = {
  codeChallenge: "c".repeat(43),
  redirectUri: "https://site.example/ar/account/settings/notifications",
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

  it("answers no address until the login is set up, from any page (HUD-1)", async () => {
    expect(await (await call(start)).json()).toEqual({ url: null });
    expect(
      await (
        await call({ ...start, redirectUri: "https://site.example/elsewhere" })
      ).json()
    ).toEqual({ url: null });
  });

  it.each([
    "https://evil.example/account/settings/notifications",
    "https://site.example/diwan/events",
    "https://site.example/account/settings/notifications?next=x",
    "https://site.example/account/profile",
  ])(
    "sends Telegram back only to the settings page, not %s",
    async (redirectUri) => {
      env.TELEGRAM_BOT_TOKEN = `8506082400:${"a".repeat(35)}`;
      env.TELEGRAM_LOGIN_CLIENT_SECRET = "s".repeat(32);
      expect((await call({ ...start, redirectUri })).status).toBe(400);
    }
  );

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
