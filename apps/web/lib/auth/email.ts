import type { Database } from "@repo/database";
import type { AuthError, SupabaseClient } from "@supabase/supabase-js";

/** AUIB addresses are verified automatically once confirmed. */
export const AUIB_DOMAIN = "auib.edu.iq";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/u;
const SPACES = /\s/gu;
const DOMAIN_TAIL = /\.?auib\.edu\.iq$/u;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const isValidEmail = (email: string) =>
  EMAIL.test(normalizeEmail(email));

export const isAuibEmail = (email: string) =>
  normalizeEmail(email).split("@")[1] === AUIB_DOMAIN;

/**
 * What goes before @auib.edu.iq, from whatever was typed in a field that
 * adds the domain itself: people often type the whole address, with or
 * without the "@" (Nov 7, 2026: seven accounts were made as
 * "name.123auib.edu.iq@auib.edu.iq").
 */
export const auibLocalPart = (typed: string) =>
  normalizeEmail(typed)
    .replace(SPACES, "")
    .split("@")[0]
    ?.replace(DOMAIN_TAIL, "") ?? "";

export const MIN_PASSWORD_LENGTH = 12;

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
  | "auib_only"
  | "no_account"
  | "email_reserved"
  | "invalid_code"
  | "weak_password"
  | "breached_password"
  | "reauthentication_needed"
  | "terms_required";

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
    case "reauthentication_needed":
    case "reauthentication_not_valid":
      return "reauthentication_needed";
    case "user_already_exists":
    case "email_exists":
      return "user_exists";
    case "signup_disabled":
    case "email_provider_disabled":
      return "signups_disabled";
    case "email_address_invalid":
    case "validation_failed":
      return "invalid_email";
    case "otp_expired":
      return "invalid_code";
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
  /** 18 or older; a student under 18 gives `minor` instead (decisions §10). */
  adult: boolean;
  /**
   * That the person agrees to the Terms of Use and the Privacy Notice
   * (decisions §4); recorded with the account.
   */
  agreed: boolean;
  /** From the Turnstile widget, when the human check is on. */
  captchaToken?: string;
  email: string;
  locale: "ar" | "en";
  /**
   * A student under 18 (decisions §10, Minors): the month and year of
   * birth, kept only to lift the minors' rules at 18, and the parent's
   * address, where the consent link (F-46) goes once the account is
   * confirmed.
   */
  minor?: { birthMonth: number; birthYear: number; parentEmail: string };
  /**
   * The name in English and in Arabic, each in four parts as on the
   * person's papers: name, father's, grandfather's and last (decisions.md). Required for addresses outside AUIB, which a partner verifies by
   * them; AUIB addresses give their names in setup, after confirming the
   * email.
   */
  names?: Record<"ar" | "en", NameParts>;
  /**
   * Why an outside address may sign up (decisions.md: membership is
   * for AUIB addresses): a partner's invitation code, or an application to
   * partner, or a guest account to book events (decisions.md). The
   * database refuses an outside address with none of these.
   */
  outside?:
    | { invitation: string }
    | { partnerApplicant: true }
    | { guest: true };
  password: string;
  /** Where the confirmation link lands (the Diwan /auth/callback). */
  redirectTo: string;
}

const NAME_PARTS = ["first", "father", "grandfather", "last"] as const;

/** One language's name: name, father's, grandfather's and last. */
type NameParts = Record<(typeof NAME_PARTS)[number], string>;

/** Where an outside address came from, for the profile trigger. */
const outsideMetadata = (outside: SignUpDetails["outside"]) => {
  if (!outside) {
    return {};
  }
  if ("invitation" in outside) {
    return { invitation: outside.invitation };
  }
  if ("partnerApplicant" in outside) {
    return { partner_applicant: "true" };
  }
  return "guest" in outside ? { guest: "true" } : {};
};

/** A student under 18 (decisions §19): birth month and year, the parent. */
const minorMetadata = (minor: SignUpDetails["minor"]) =>
  minor
    ? {
        adult: "false",
        birth_month: String(minor.birthMonth),
        birth_year: String(minor.birthYear),
        parent_email: normalizeEmail(minor.parentEmail),
      }
    : {};

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
  if (!details.agreed) {
    return { code: "terms_required", ok: false };
  }
  // Under 18 only as an AUIB student, with the parent's address.
  if (!(details.adult || (details.minor && isAuibEmail(email)))) {
    return { code: "terms_required", ok: false };
  }
  const auib = isAuibEmail(email);
  // Membership is for AUIB addresses (decisions.md); an outside one
  // comes only with a partner's invitation or an application to partner.
  if (!(auib || details.outside)) {
    return { code: "auib_only", ok: false };
  }
  const parts = Object.fromEntries(
    (["en", "ar"] as const).flatMap((language) =>
      NAME_PARTS.map((part) => [
        `${part}_name_${language}`,
        details.names?.[language][part].trim() ?? "",
      ])
    )
  );
  const named = Object.values(parts).every((part) => part !== "");
  if (!(auib || named)) {
    return { code: "names_required", ok: false };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    options: {
      ...captcha(details.captchaToken),
      data: {
        ...(named ? parts : {}),
        ...outsideMetadata(details.outside),
        agreed_at: new Date().toISOString(),
        ...minorMetadata(details.minor),
        locale: details.locale,
      },
      emailRedirectTo: details.redirectTo,
    },
    password: details.password,
  });

  if (error) {
    return { code: toEmailAuthError(error), ok: false };
  }
  // An address that already has an account comes back with no identities
  // (Supabase hides it so as not to say so); here it is said
  // (decisions.md): sign in instead.
  if (data.user && (data.user.identities ?? []).length === 0) {
    return { code: "user_exists", ok: false };
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

const CODE = /^\d{6,10}$/u;

/**
 * The code in a sign-in or confirmation email, typed in where the link
 * can't be opened (another device, an app's own browser, a mail scanner
 * that used the link first). It signs the member in.
 */
export const verifyEmailCode = async (
  supabase: Client,
  email: string,
  code: string
): Promise<AuthResult> => {
  const token = code.replace(/\s/gu, "");
  if (!CODE.test(token)) {
    return { code: "invalid_code", ok: false };
  }
  const { error } = await supabase.auth.verifyOtp({
    email: normalizeEmail(email),
    token,
    type: "email",
  });
  return error
    ? { code: toEmailAuthError(error), ok: false }
    : { ok: true, value: undefined };
};

/** Sends the sign-up confirmation email again (the inbox screen's button). */
export const resendConfirmation = async (
  supabase: Client,
  email: string,
  redirectTo?: string
): Promise<AuthResult> => {
  const { error } = await supabase.auth.resend({
    email: normalizeEmail(email),
    options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    type: "signup",
  });
  return error
    ? { code: toEmailAuthError(error), ok: false }
    : { ok: true, value: undefined };
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
