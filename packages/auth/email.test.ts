import { describe, expect, test, vi } from "vitest";
import {
  isAuibEmail,
  isValidEmail,
  normalizeEmail,
  sendMagicLink,
  signUpWithEmail,
  toEmailAuthError,
} from "./email";

describe("email helpers", () => {
  test("recognises AUIB addresses in any case", () => {
    expect(isAuibEmail("Student@AUIB.edu.iq ")).toBe(true);
    expect(isAuibEmail("someone@auib.edu.iq.evil.com")).toBe(false);
    expect(isAuibEmail("someone@gmail.com")).toBe(false);
  });

  test("validates and normalizes addresses", () => {
    expect(normalizeEmail("  A@B.Co ")).toBe("a@b.co");
    expect(isValidEmail("no-at-sign")).toBe(false);
    expect(isValidEmail("a@b.co")).toBe(true);
  });

  test("maps Supabase errors to UI codes", () => {
    expect(toEmailAuthError({ code: "invalid_credentials", status: 400 })).toBe(
      "invalid_credentials"
    );
    expect(toEmailAuthError({ code: "user_already_exists", status: 422 })).toBe(
      "user_exists"
    );
    expect(toEmailAuthError({ code: undefined, status: 429 })).toBe(
      "rate_limited"
    );
    expect(toEmailAuthError({ code: "something_new", status: 500 })).toBe(
      "unknown"
    );
    // A new account whose address is a member's verified personal email.
    expect(
      toEmailAuthError({
        code: "unexpected_failure",
        message: "Database error saving new user",
        status: 500,
      })
    ).toBe("email_reserved");
  });
});

describe("the human check (Turnstile)", () => {
  const client = (error: object | null) => {
    const signInWithOtp = vi.fn(() => Promise.resolve({ data: {}, error }));
    return {
      signInWithOtp,
      supabase: { auth: { signInWithOtp } } as never,
    };
  };

  test("sends the widget's token with the request", async () => {
    const { signInWithOtp, supabase } = client(null);
    await sendMagicLink(supabase, "a@auib.edu.iq", "https://x/cb", "tok-1");
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "a@auib.edu.iq",
      options: {
        captchaToken: "tok-1",
        emailRedirectTo: "https://x/cb",
        shouldCreateUser: false,
      },
    });
  });

  test("says when the check failed instead of pretending a link was sent", async () => {
    const { supabase } = client({ code: "captcha_failed", status: 400 });
    expect(
      await sendMagicLink(supabase, "a@auib.edu.iq", "https://x/cb")
    ).toEqual({ code: "captcha_failed", ok: false });
  });

  test("still hides whether an account exists", async () => {
    const { supabase } = client({ code: "otp_disabled", status: 422 });
    expect(
      await sendMagicLink(supabase, "nobody@auib.edu.iq", "https://x/cb")
    ).toEqual({ ok: true, value: undefined });
  });
});

describe("signing up", () => {
  const client = () => {
    const signUp = vi.fn(() =>
      Promise.resolve({ data: { session: null }, error: null })
    );
    return { signUp, supabase: { auth: { signUp } } as never };
  };
  const base = {
    locale: "en" as const,
    password: "a-long-password",
    redirectTo: "https://x/cb",
  };
  const names = {
    familyAr: "فرجو",
    familyEn: "Farjo",
    givenAr: "شاهين",
    givenEn: "Shaheen",
  };

  test("an AUIB address needs only email and password; names come in setup", async () => {
    const { signUp, supabase } = client();
    const result = await signUpWithEmail(supabase, {
      ...base,
      email: "s@auib.edu.iq",
    });
    expect(result.ok).toBe(true);
    const sent = (signUp.mock.calls[0] as unknown[])[0] as {
      options: { data: Record<string, unknown> };
    };
    expect(sent.options.data).toEqual({ locale: "en" });
  });

  test("an address outside AUIB gives all four names, for the Council to verify", async () => {
    const { signUp, supabase } = client();
    expect(
      await signUpWithEmail(supabase, { ...base, email: "s@gmail.com" })
    ).toEqual({ code: "names_required", ok: false });
    expect(signUp).not.toHaveBeenCalled();
    const result = await signUpWithEmail(supabase, {
      ...base,
      email: "s@gmail.com",
      names,
      verificationStatement: "AUIB alumnus, 2024",
    });
    expect(result.ok).toBe(true);
    const sent = (signUp.mock.calls[0] as unknown[])[0] as {
      options: { data: Record<string, unknown> };
    };
    expect(sent.options.data).toMatchObject({
      full_name_en: "Shaheen Farjo",
      given_name_ar: "شاهين",
      verification_statement: "AUIB alumnus, 2024",
    });
  });
});
