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
  | "class_required"
  | "age_required"
  | "no_account"
  | "email_reserved"
  | "invalid_code"
  | "weak_password"
  | "breached_password"
  | "reauthentication_needed";

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
  /** 18 or older; under 18 gives `minor` instead (decisions.md, Members). */
  adult: boolean;
  /** From the Turnstile widget, when the human check is on. */
  captchaToken?: string;
  /**
   * An AUIB address's class (decisions.md, Members): a student is a
   * Member; faculty, staff or alumni are Associates.
   */
  class?: "student" | "staff";
  email: string;
  locale: "ar" | "en";
  /**
   * The mailing list's two topics (decisions.md, Channels and email):
   * ticked for members (an opt-out box), unticked for guests.
   */
  mailing?: boolean;
  /**
   * Under 18 (decisions.md, Members): the month and year of birth, kept
   * only to lift the minors' rules at 18, and the parent's address, where
   * the consent link (parent-consent) goes once the account is confirmed.
   */
  minor?: { birthMonth: number; birthYear: number; parentEmail: string };
  /**
   * The official name in English and in Arabic (decisions.md, Members):
   * the four parts as on the person's papers, or the given and family
   * names where the papers don't use four. Locked at once.
   */
  names: Record<"ar" | "en", NameParts>;
  /**
   * What an invitation or a partner application attaches (decisions.md,
   * Members): every invitation uses this one sign-up and adds its role.
   */
  outside?: { invitation: string } | { partnerApplicant: true };
  password: string;
  /** Where the confirmation link lands (/auth/callback). */
  redirectTo: string;
  /** Any other address: "I studied at AUIB" sends an Associate request. */
  studiedAtAuib?: boolean;
  /** The Arabic form of a title that names the person, one tap. */
  titleForm?: "masculine" | "feminine";
}

const NAME_PARTS = ["first", "father", "grandfather", "last"] as const;

/** One language's name: given, father's, grandfather's and family. */
type NameParts = Record<(typeof NAME_PARTS)[number], string>;

/** The official name is complete: four parts, or given and family. */
const nameComplete = (parts: NameParts) => {
  const has = (part: keyof NameParts) => parts[part].trim() !== "";
  return has("first") && ((has("father") && has("grandfather")) || has("last"));
};

/** What an invitation or a partner application attaches, for the trigger. */
const outsideMetadata = (outside: SignUpDetails["outside"]) => {
  if (!outside) {
    return {};
  }
  return "invitation" in outside
    ? { invitation: outside.invitation }
    : { partner_applicant: "true" };
};

/** Under 18 (decisions.md, Members): birth month and year, the parent. */
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
  const auib = isAuibEmail(email);
  // Under 18: an AUIB student, or by an invitation (a Qalam student).
  const invited = Boolean(details.outside && "invitation" in details.outside);
  if (!(details.adult || (details.minor && (auib || invited)))) {
    return { code: "age_required", ok: false };
  }
  if (auib && !details.class) {
    return { code: "class_required", ok: false };
  }
  if (!(nameComplete(details.names.en) && nameComplete(details.names.ar))) {
    return { code: "names_required", ok: false };
  }
  const parts = Object.fromEntries(
    (["en", "ar"] as const).flatMap((language) =>
      NAME_PARTS.map((part) => [
        `${part}_name_${language}`,
        details.names[language][part].trim(),
      ])
    )
  );

  const { data, error } = await supabase.auth.signUp({
    email,
    options: {
      ...captcha(details.captchaToken),
      data: {
        ...parts,
        ...outsideMetadata(details.outside),
        // The sign-up line (decisions.md, Members): the Terms, the Privacy
        // Notice, the Code of Conduct and signing electronically. The
        // database logs the versions and its own time.
        agreed_at: new Date().toISOString(),
        ...minorMetadata(details.minor),
        ...(auib && details.class ? { class: details.class } : {}),
        ...(!auib && details.studiedAtAuib ? { studied_at_auib: "true" } : {}),
        ...(details.titleForm ? { title_form: details.titleForm } : {}),
        locale: details.locale,
        mailing: details.mailing ? "true" : "false",
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
