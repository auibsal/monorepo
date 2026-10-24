// @vitest-environment node
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  authorizeUrl,
  exchangeCode,
  TELEGRAM_ISSUER,
} from "@/lib/api/telegram-login";

const CLIENT_ID = 8_506_082_400;
const request = {
  clientId: CLIENT_ID,
  clientSecret: "s".repeat(32),
  code: "the-code",
  codeVerifier: "v".repeat(43),
  redirectUri: "https://nexus.example/profile",
};

let privateKey: CryptoKey;
let verifyKeys: ReturnType<typeof createLocalJWKSet>;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  ({ privateKey } = pair);
  verifyKeys = createLocalJWKSet({
    keys: [{ ...(await exportJWK(pair.publicKey)), alg: "RS256", kid: "k" }],
  });
});

const idToken = (claims: Record<string, unknown>, aud = String(CLIENT_ID)) =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "k" })
    .setIssuer(TELEGRAM_ISSUER)
    .setAudience(aud)
    .setSubject("123")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);

const tokenEndpoint = (body: object, status = 200) =>
  vi.fn(async () => Response.json(body, { status })) as unknown as typeof fetch;

describe("Telegram login", () => {
  it("asks for the profile and bot access with PKCE", () => {
    const url = new URL(
      authorizeUrl({
        clientId: CLIENT_ID,
        codeChallenge: "c".repeat(43),
        redirectUri: request.redirectUri,
        state: "s".repeat(20),
      })
    );
    expect(url.origin + url.pathname).toBe("https://oauth.telegram.org/auth");
    expect(url.searchParams.get("client_id")).toBe(String(CLIENT_ID));
    expect(url.searchParams.get("scope")).toBe(
      "openid profile telegram:bot_access"
    );
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("response_type")).toBe("code");
  });

  it("exchanges the code with the client's credentials and reads the account", async () => {
    const fetcher = tokenEndpoint({
      id_token: await idToken({ id: 4242, preferred_username: "hoopoe" }),
    });
    const identity = await exchangeCode(request, { fetcher, verifyKeys });
    expect(identity).toEqual({ telegramId: 4242, username: "hoopoe" });

    const [url, init] = (fetcher as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, RequestInit];
    expect(url).toBe("https://oauth.telegram.org/token");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Basic ${btoa(`${CLIENT_ID}:${request.clientSecret}`)}`
    );
    const sent = init.body as URLSearchParams;
    expect(sent.get("grant_type")).toBe("authorization_code");
    expect(sent.get("code_verifier")).toBe(request.codeVerifier);
  });

  it("refuses a token issued for another bot", async () => {
    const fetcher = tokenEndpoint({
      id_token: await idToken({ id: 4242 }, "999"),
    });
    await expect(
      exchangeCode(request, { fetcher, verifyKeys })
    ).rejects.toThrow("invalid_token");
  });

  it("refuses a token without a Telegram id", async () => {
    const fetcher = tokenEndpoint({ id_token: await idToken({}) });
    await expect(
      exchangeCode(request, { fetcher, verifyKeys })
    ).rejects.toThrow("invalid_token");
  });

  it("reports a refused exchange", async () => {
    const fetcher = tokenEndpoint({ error: "invalid_grant" }, 400);
    await expect(
      exchangeCode(request, { fetcher, verifyKeys })
    ).rejects.toThrow("exchange_failed");
  });
});
