import type { Database } from "@repo/database";
import type { AuthError, SupabaseClient } from "@supabase/supabase-js";

/** AUIB addresses are verified automatically once confirmed. */
export const AUIB_DOMAIN = "auib.edu.iq";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const isValidEmail = (email: string) =>
  EMAIL.test(normalizeEmail(email));

export const isAuibEmail = (email: string) =>
  normalizeEmail(email).split("@")[1] === AUIB_DOMAIN;

export const MIN_PASSWORD_LENGTH = 10;

export type EmailAuthErrorCode =
  | "captcha_failed"
  | "email_not_confirmed"
  | "invalid_credentials"
  | "invalid_email"
  | "rate_limited"
  | "signups_disabled"
  | "unknown"
  | "user_exists"
  | "names_required"
  | "email_reserved"
  | "weak_password";

export type AuthResult<T = undefined> =
  | { ok: true; value: T }
  | { code: EmailAuthErrorCode; ok: false };

/** Maps a Supabase Auth error to a code the UI can translate. */
export const toEmailAuthError = (
  error:
    | (Pick<AuthError, "code" | "status"> & { message?: string })
    | null
    | undefined
): EmailAuthErrorCode => {
  // The database refuses a new account whose address is already a member's
  // verified personal email (private.guard_sign_in_email); Supabase Auth
  // reports it as a failure to save the user.
  if (error?.message?.includes("Database error saving new user")) {
    return "email_reserved";
  }
  switch (error?.code) {
    case "captcha_failed":
      return "captcha_failed";
    case "invalid_credentials":
      return "invalid_credentials";
    case "email_not_confirmed":
      return "email_not_confirmed";
    case "weak_password":
      return "weak_password";
    case "user_already_exists":
    case "email_exists":
      return "user_exists";
    case "signup_disabled":
    case "email_provider_disabled":
      return "signups_disabled";
    case "email_address_invalid":
    case "validation_failed":
      return "invalid_email";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "rate_limited";
    default:
      return error?.status === 429 ? "rate_limited" : "unknown";
  }
};

type Client = SupabaseClient<Database>;

/**
 * Supabase Auth's human check (Cloudflare Turnstile): when it is on, every
 * sign-up, sign-in and reset request carries the token the widget gave.
 */
const captcha = (captchaToken?: string) =>
  captchaToken ? { captchaToken } : {};

/** Errors that the "don't reveal whether an account exists" rule lets through. */
const SHOWN: EmailAuthErrorCode[] = ["captcha_failed", "rate_limited"];

export interface SignUpDetails {
  /** From the Turnstile widget, when the human check is on. */
  captchaToken?: string;
  email: string;
  locale: "ar" | "en";
  /** First and last name, in English and in Arabic (all four required). */
  names: {
    familyAr: string;
    familyEn: string;
    givenAr: string;
    givenEn: string;
  };
  password: string;
  /** Where the confirmation link lands (the Nexus /auth/callback). */
  redirectTo: string;
  /** For non-AUIB addresses: who the applicant is (alumni, guest…). */
  verificationStatement?: string;
}

/**
 * Creates an account. Metadata here only fills in the profile; it is never
 * used for authorization (roles live in access.role_assignments).
 */
export const signUpWithEmail = async (
  supabase: Client,
  details: SignUpDetails
): Promise<AuthResult<{ needsConfirmation: boolean }>> => {
  const email = normalizeEmail(details.email);

  if (!isValidEmail(email)) {
    return { code: "invalid_email", ok: false };
  }
  if (details.password.length < MIN_PASSWORD_LENGTH) {
    return { code: "weak_password", ok: false };
  }
  const names = {
    familyAr: details.names.familyAr.trim(),
    familyEn: details.names.familyEn.trim(),
    givenAr: details.names.givenAr.trim(),
    givenEn: details.names.givenEn.trim(),
  };
  if (Object.values(names).some((part) => part === "")) {
    return { code: "names_required", ok: false };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    options: {
      ...captcha(details.captchaToken),
      data: {
        family_name_ar: names.familyAr,
        family_name_en: names.familyEn,
        full_name_ar: `${names.givenAr} ${names.familyAr}`,
        full_name_en: `${names.givenEn} ${names.familyEn}`,
        given_name_ar: names.givenAr,
        given_name_en: names.givenEn,
        locale: details.locale,
        verification_statement: isAuibEmail(email)
          ? undefined
          : details.verificationStatement?.trim() || undefined,
      },
      emailRedirectTo: details.redirectTo,
    },
    password: details.password,
  });

  if (error) {
    return { code: toEmailAuthError(error), ok: false };
  }

  return { ok: true, value: { needsConfirmation: !data.session } };
};

export const signInWithPassword = async (
  supabase: Client,
  email: string,
  password: string,
  captchaToken?: string
): Promise<AuthResult> => {
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
    ...(captchaToken ? { options: { captchaToken } } : {}),
  });

  return error
    ? { code: toEmailAuthError(error), ok: false }
    : { ok: true, value: undefined };
};

/** Magic link for existing accounts (it never creates one). */
export const sendMagicLink = async (
  supabase: Client,
  email: string,
  redirectTo: string,
  captchaToken?: string
): Promise<AuthResult> => {
  if (!isValidEmail(email)) {
    return { code: "invalid_email", ok: false };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizeEmail(email),
    options: {
      ...captcha(captchaToken),
      emailRedirectTo: redirectTo,
      shouldCreateUser: false,
    },
  });

  // Don't reveal whether an account exists.
  const code = error ? toEmailAuthError(error) : null;
  if (code && SHOWN.includes(code)) {
    return { code, ok: false };
  }
  return { ok: true, value: undefined };
};

export const sendPasswordReset = async (
  supabase: Client,
  email: string,
  redirectTo: string,
  captchaToken?: string
): Promise<AuthResult> => {
  if (!isValidEmail(email)) {
    return { code: "invalid_email", ok: false };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(
    normalizeEmail(email),
    { ...captcha(captchaToken), redirectTo }
  );

  const code = error ? toEmailAuthError(error) : null;
  if (code && SHOWN.includes(code)) {
    return { code, ok: false };
  }
  return { ok: true, value: undefined };
};
