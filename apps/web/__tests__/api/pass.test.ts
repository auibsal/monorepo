// @vitest-environment node
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  authorizeUrl,
  exchangeCode,
  identityFrom,
  PassError,
} from "@/lib/api/pass";
import { issueTicket, readTicket } from "@/lib/api/pass-account";

const ISSUER = "https://pass.example";
const discovery = {
  authorization_endpoint: `${ISSUER}/authorize`,
  issuer: ISSUER,
  jwks_uri: `${ISSUER}/jwks`,
  token_endpoint: `${ISSUER}/token`,
};
const request = {
  clientId: "sal",
  clientSecret: "s".repeat(32),
  code: "the-code",
  codeVerifier: "v".repeat(43),
  nonce: "n".repeat(43),
  redirectUri: "https://auibsal.org/auth/pass",
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

const idToken = (claims: Record<string, unknown>, aud = "sal") =>
  new SignJWT({ nonce: request.nonce, ...claims })
    .setProtectedHeader({ alg: "RS256", kid: "k" })
    .setIssuer(ISSUER)
    .setAudience(aud)
    .setSubject("pass-123")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);

const tokenEndpoint = (body: object, status = 200) =>
  vi.fn(async () => Response.json(body, { status })) as unknown as typeof fetch;

describe("The IDEA Pass", () => {
  it("asks for the person and their student status, with PKCE and a nonce", () => {
    const url = new URL(
      authorizeUrl(discovery, {
        clientId: "sal",
        codeChallenge: "c".repeat(43),
        locale: "ar",
        nonce: request.nonce,
        redirectUri: request.redirectUri,
        state: "s".repeat(20),
      })
    );
    expect(url.origin + url.pathname).toBe(`${ISSUER}/authorize`);
    expect(url.searchParams.get("scope")).toBe(
      "openid email profile student student_email"
    );
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("nonce")).toBe(request.nonce);
    expect(url.searchParams.get("ui_locales")).toBe("ar");
  });

  it("reads the person and their AUIB student status", async () => {
    const fetcher = tokenEndpoint({
      id_token: await idToken({
        email: "Someone@Gmail.com",
        email_verified: true,
        given_name: "Shaheen",
        locale: "ar-IQ",
        student: { university: "auib", until: "2027-06-30", verified: true },
        student_email: "S.Farjo@AUIB.edu.iq",
        student_email_verified: true,
      }),
    });
    expect(
      await exchangeCode(discovery, request, { fetcher, verifyKeys })
    ).toEqual({
      email: "someone@gmail.com",
      familyName: null,
      givenName: "Shaheen",
      locale: "ar",
      studentEmail: "s.farjo@auib.edu.iq",
      studentUntil: "2027-06-30",
      sub: "pass-123",
    });
    const [, init] = (fetcher as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, RequestInit];
    expect((init.body as URLSearchParams).get("code_verifier")).toBe(
      request.codeVerifier
    );
  });

  it("counts only checked addresses and AUIB student status", () => {
    expect(
      identityFrom({
        email: "x@auib.edu.iq",
        email_verified: false,
        student: { verified: false },
        student_email: "x@auib.edu.iq",
        student_email_verified: false,
        sub: "p",
      })
    ).toMatchObject({ email: null, studentEmail: null, studentUntil: null });
    expect(
      identityFrom({
        student_email: "x@uni.example",
        student_email_verified: true,
        sub: "p",
      }).studentEmail
    ).toBeNull();
    expect(
      identityFrom({
        student: { university: "other", until: "2027-06-30", verified: true },
        sub: "p",
      }).studentUntil
    ).toBeNull();
    expect(
      identityFrom({
        student: { university: "auib", until: "soon", verified: true },
        sub: "p",
      }).studentUntil
    ).toBeNull();
  });

  it("refuses a token for another app, or from another sign-in", async () => {
    await expect(
      exchangeCode(discovery, request, {
        fetcher: tokenEndpoint({ id_token: await idToken({}, "other") }),
        verifyKeys,
      })
    ).rejects.toBeInstanceOf(PassError);
    await expect(
      exchangeCode(discovery, request, {
        fetcher: tokenEndpoint({ id_token: await idToken({ nonce: "other" }) }),
        verifyKeys,
      })
    ).rejects.toThrow("invalid_token");
    await expect(
      exchangeCode(discovery, request, {
        fetcher: tokenEndpoint({ error: "invalid_grant" }, 400),
        verifyKeys,
      })
    ).rejects.toThrow("exchange_failed");
  });

  it("keeps the person's choice open on a signed ticket only", async () => {
    const identity = identityFrom({
      email: "a@b.c",
      email_verified: true,
      sub: "p",
    });
    const ticket = await issueTicket(identity, "k".repeat(32));
    expect(await readTicket(ticket, "k".repeat(32))).toEqual(identity);
    expect(await readTicket(ticket, "x".repeat(32))).toBeNull();
  });
});
