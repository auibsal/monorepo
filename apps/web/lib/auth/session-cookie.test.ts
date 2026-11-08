import { describe, expect, test } from "vitest";
import { hasSessionCookie } from "./session-cookie";

describe("signed in on auibsal.org", () => {
  test("no session cookie", () => {
    expect(hasSessionCookie("")).toBe(false);
    expect(hasSessionCookie("NEXT_LOCALE=en; zaraz-consent=%7B%7D")).toBe(
      false
    );
  });

  test("a session, whole or split into chunks", () => {
    expect(hasSessionCookie("sb-abcdefgh-auth-token=base64-eyJ")).toBe(true);
    expect(
      hasSessionCookie("NEXT_LOCALE=ar; sb-abcdefgh-auth-token.0=base64-eyJ")
    ).toBe(true);
  });

  test("an emptied cookie is signed out", () => {
    expect(hasSessionCookie("sb-abcdefgh-auth-token=")).toBe(false);
  });

  test("other Supabase cookies are not a session", () => {
    expect(hasSessionCookie("sb-abcdefgh-auth-token-code-verifier=x")).toBe(
      false
    );
  });
});
