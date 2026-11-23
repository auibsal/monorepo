import { describe, expect, test, vi } from "vitest";
import {
  auibLocalPart,
  isAuibEmail,
  isValidEmail,
  normalizeEmail,
  sendPasswordReset,
  signUpWithEmail,
  toEmailAuthError,
  unusualStudentNumber,
} from "./email";

/** An official-name part column, as the sign-up would send it. */
const NAME_PART = /^(first|father|grandfather|last)_name_/u;

describe("email helpers", () => {
  test("recognizes AUIB addresses in any case", () => {
    expect(isAuibEmail("Student@AUIB.edu.iq ")).toBe(true);
    expect(isAuibEmail("someone@auib.edu.iq.evil.com")).toBe(false);
    expect(isAuibEmail("someone@gmail.com")).toBe(false);
  });

  test("keeps only what goes before @auib.edu.iq", () => {
    expect(auibLocalPart("maryam.1241295")).toBe("maryam.1241295");
    expect(auibLocalPart(" Maryam.1241295@AUIB.edu.iq ")).toBe(
      "maryam.1241295"
    );
    expect(auibLocalPart("maryam.1241295auib.edu.iq")).toBe("maryam.1241295");
    expect(auibLocalPart("2520027.auib.edu.iq")).toBe("2520027");
    expect(auibLocalPart("2520027 @auib.edu.iq")).toBe("2520027");
    expect(auibLocalPart("@auib.edu.iq")).toBe("");
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
    expect(
      toEmailAuthError({
        code: "current_password_required" as never,
        status: 400,
      })
    ).toBe("current_password_required");
    expect(
      toEmailAuthError({
        code: "current_password_invalid" as never,
        status: 400,
      })
    ).toBe("current_password_invalid");
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
    const resetPasswordForEmail = vi.fn(() =>
      Promise.resolve({ data: {}, error })
    );
    return {
      resetPasswordForEmail,
      supabase: { auth: { resetPasswordForEmail } } as never,
    };
  };

  test("sends the widget's token with the request", async () => {
    const { resetPasswordForEmail, supabase } = client(null);
    await sendPasswordReset(supabase, "a@auib.edu.iq", "https://x/cb", "tok-1");
    expect(resetPasswordForEmail).toHaveBeenCalledWith("a@auib.edu.iq", {
      captchaToken: "tok-1",
      redirectTo: "https://x/cb",
    });
  });

  test("says when the check failed instead of pretending an email was sent", async () => {
    const { supabase } = client({ code: "captcha_failed", status: 400 });
    expect(
      await sendPasswordReset(supabase, "a@auib.edu.iq", "https://x/cb")
    ).toEqual({ code: "captcha_failed", ok: false });
  });

  test("still hides whether an account exists", async () => {
    const { supabase } = client({ code: "otp_disabled", status: 422 });
    expect(
      await sendPasswordReset(supabase, "nobody@auib.edu.iq", "https://x/cb")
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
    adult: true,
    locale: "en" as const,
    name: "Lina Tamimi",
    password: "a-long-password",
    redirectTo: "https://x/cb",
  };
  const sentData = (signUp: ReturnType<typeof vi.fn>) =>
    (
      (signUp.mock.calls[0] as unknown[])[0] as {
        options: { data: Record<string, unknown> };
      }
    ).options.data;

  test("no account without saying whether you're 18 or older", async () => {
    const { signUp, supabase } = client();
    expect(
      await signUpWithEmail(supabase, {
        ...base,
        adult: false,
        email: "s@gmail.com",
      })
    ).toEqual({ code: "age_required", ok: false });
    expect(signUp).not.toHaveBeenCalled();
  });

  test("an address that already has an account is refused, not sent a new email", async () => {
    // Supabase answers a second sign-up with a user that has no identities.
    const signUp = vi.fn(() =>
      Promise.resolve({
        data: { session: null, user: { identities: [] } },
        error: null,
      })
    );
    const supabase = { auth: { signUp } } as never;
    expect(
      await signUpWithEmail(supabase, {
        ...base,
        email: "s@auib.edu.iq",
      })
    ).toEqual({ code: "user_exists", ok: false });
  });

  test("an AUIB address is never asked its class: the database reads it", async () => {
    const { signUp, supabase } = client();
    const result = await signUpWithEmail(supabase, {
      ...base,
      email: "lina.tamimi@auib.edu.iq",
      titleForm: "feminine",
    });
    expect(result.ok).toBe(true);
    expect(sentData(signUp)).not.toHaveProperty("class");
    expect(sentData(signUp)).toMatchObject({
      agreed_at: expect.any(String),
      full_name_en: "Lina Tamimi",
      title_form: "feminine",
    });
    // The sign-up line is the consent: no separate e-sign box.
    expect(sentData(signUp)).not.toHaveProperty("esign");
  });

  test("any other address signs up as a guest; alumni ask for Associate", async () => {
    const { signUp, supabase } = client();
    const result = await signUpWithEmail(supabase, {
      ...base,
      email: "visitor@gmail.com",
      studiedAtAuib: true,
    });
    expect(result.ok).toBe(true);
    expect(sentData(signUp)).toMatchObject({ studied_at_auib: "true" });
    expect(sentData(signUp)).not.toHaveProperty("class");
  });

  test("everyone gives a name, in any number of words; Membership adds the official one", async () => {
    const { signUp, supabase } = client();
    expect(
      await signUpWithEmail(supabase, {
        ...base,
        email: "s@gmail.com",
        name: " ",
      })
    ).toEqual({ code: "name_required", ok: false });
    expect(signUp).not.toHaveBeenCalled();
    expect(
      (
        await signUpWithEmail(supabase, {
          ...base,
          email: "s@gmail.com",
          name: "Lina",
        })
      ).ok
    ).toBe(true);
    // No official-name parts at sign-up, in either language.
    expect(
      Object.keys(sentData(signUp)).filter((k) => NAME_PART.test(k))
    ).toEqual([]);
    expect(sentData(signUp)).toMatchObject({ full_name_en: "Lina" });
  });

  test("an invitation uses the same sign-up and is attached", async () => {
    const { signUp, supabase } = client();
    const result = await signUpWithEmail(supabase, {
      ...base,
      adult: false,
      email: "student@school.example",
      minor: { birthMonth: 3, birthYear: 2011, parentEmail: "p@example.com" },
      outside: { invitation: "abc123" },
    });
    expect(result.ok).toBe(true);
    expect(sentData(signUp)).toMatchObject({
      adult: "false",
      invitation: "abc123",
      parent_email: "p@example.com",
    });
  });

  const minor = {
    adult: false,
    minor: { birthMonth: 3, birthYear: 2011, parentEmail: "p@example.com" },
  };

  test("a student signs up with their AUIB address", async () => {
    const { supabase } = client();
    const result = await signUpWithEmail(supabase, {
      ...base,
      ...minor,
      email: "2560101@auib.edu.iq",
    });
    expect(result.ok).toBe(true);
  });

  test("never with a faculty or staff address: Associates are 18 or older", async () => {
    const { signUp, supabase } = client();
    const result = await signUpWithEmail(supabase, {
      ...base,
      ...minor,
      email: "first.last@auib.edu.iq",
    });
    expect(result).toEqual({ code: "age_required", ok: false });
    expect(signUp).not.toHaveBeenCalled();
  });
});

describe("unusualStudentNumber", () => {
  test("passes the shapes AUIB gives", () => {
    for (const address of [
      "name.1241295@auib.edu.iq",
      "name.1221002@auib.edu.iq",
      "name.2210001@auib.edu.iq",
      "2520001@auib.edu.iq",
      "2620001@auib.edu.iq",
      "name.02220006@auib.edu.iq",
    ]) {
      expect(unusualStudentNumber(address, 2026)).toBe(false);
    }
  });

  test("warns on a format, a length or a year that doesn't fit", () => {
    for (const address of [
      // The older years come with a name, the newer without.
      "1241295@auib.edu.iq",
      "name.2520001@auib.edu.iq",
      "124129@auib.edu.iq",
      "11212345@auib.edu.iq",
      "name.1291295@auib.edu.iq",
      "2720001@auib.edu.iq",
    ]) {
      expect(unusualStudentNumber(address, 2026)).toBe(true);
    }
  });

  test("says nothing of staff or other addresses", () => {
    expect(unusualStudentNumber("first.last@auib.edu.iq", 2026)).toBe(false);
    expect(unusualStudentNumber("1@example.com", 2026)).toBe(false);
  });
});
