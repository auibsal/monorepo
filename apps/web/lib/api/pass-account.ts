import type { createAdminClient } from "@repo/database/admin";
import { jwtVerify, SignJWT } from "jose";
import type { PassIdentity } from "./pass";

type Admin = ReturnType<typeof createAdminClient>;

const TICKET_AUDIENCE = "sal-pass-ticket";

/**
 * What the sign-in route answers: a one-time token the browser exchanges
 * for its session (`verifyOtp`, type magiclink; nothing is emailed), or a
 * ticket when no account was found, so the person can make one or link the
 * one they have under another address.
 */
export type PassSignIn =
  | { status: "signed_in"; tokenHash: string }
  | { status: "unmatched"; email: string | null; ticket: string };

export class PassAccountError extends Error {
  readonly code: "linked_elsewhere" | "no_email" | "sign_in_failed";

  constructor(code: PassAccountError["code"], options?: ErrorOptions) {
    super(`IDEA Pass account: ${code}`, options);
    this.name = "PassAccountError";
    this.code = code;
  }
}

const ticketKey = (secret: string) =>
  new TextEncoder().encode(`${TICKET_AUDIENCE}:${secret}`);

/** The identity, signed for 15 minutes, while the person decides. */
export const issueTicket = (identity: PassIdentity, secret: string) =>
  new SignJWT({ identity })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(TICKET_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(ticketKey(secret));

export const readTicket = async (
  ticket: string,
  secret: string
): Promise<PassIdentity | null> => {
  try {
    const { payload } = await jwtVerify(ticket, ticketKey(secret), {
      audience: TICKET_AUDIENCE,
    });
    const identity = payload.identity as PassIdentity | undefined;
    return identity?.sub ? identity : null;
  } catch {
    return null;
  }
};

/** A one-time sign-in token for the account (no email is sent). */
const sessionToken = async (admin: Admin, email: string) => {
  const { data, error } = await admin.auth.admin.generateLink({
    email,
    type: "magiclink",
  });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    throw new PassAccountError("sign_in_failed", { cause: error });
  }
  return tokenHash;
};

const signInTo = async (admin: Admin, userId: string) => {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  const email = data?.user?.email;
  if (error || !email) {
    throw new PassAccountError("sign_in_failed", { cause: error });
  }
  return sessionToken(admin, email);
};

/** Signs in to the account linked to (or found for) this Pass. */
export const signInWithPass = async (
  admin: Admin,
  identity: PassIdentity,
  secret: string
): Promise<PassSignIn> => {
  const { data: userId, error } = await admin
    .schema("access")
    .rpc("pass_account", {
      pass_sub: identity.sub,
      student_until: identity.studentUntil ?? undefined,
      verified_email: identity.email ?? undefined,
    });
  if (error) {
    throw new PassAccountError(
      error.code === "23505" ? "linked_elsewhere" : "sign_in_failed",
      { cause: error }
    );
  }
  if (!userId) {
    return {
      email: identity.email,
      status: "unmatched",
      ticket: await issueTicket(identity, secret),
    };
  }
  return {
    status: "signed_in",
    tokenHash: await signInTo(admin, userId),
  };
};

/**
 * A new SAL account for someone the Pass knows, under the Pass's verified
 * address. A student status from the Pass makes them a member at once;
 * anyone else is confirmed by the Council, as before. Setup asks the rest.
 */
export const createWithPass = async (
  admin: Admin,
  identity: PassIdentity,
  locale: "ar" | "en"
): Promise<PassSignIn> => {
  const { email } = identity;
  if (!email) {
    throw new PassAccountError("no_email");
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      locale: identity.locale ?? locale,
      ...(identity.givenName ? { given_name_en: identity.givenName } : {}),
      ...(identity.familyName ? { family_name_en: identity.familyName } : {}),
    },
  });
  const userId = data?.user?.id;
  if (error || !userId) {
    throw new PassAccountError("sign_in_failed", { cause: error });
  }
  await linkPass(admin, identity, userId);
  return { status: "signed_in", tokenHash: await sessionToken(admin, email) };
};

/**
 * Links the Pass to an account (just made, or just signed in to), with the
 * student status it vouched for.
 */
export const linkPass = async (
  admin: Admin,
  identity: Pick<PassIdentity, "studentUntil" | "sub">,
  userId: string
) => {
  const { error } = await admin.schema("access").rpc("pass_link", {
    pass_sub: identity.sub,
    student_until: identity.studentUntil ?? undefined,
    user_id: userId,
  });
  if (error) {
    throw new PassAccountError(
      error.code === "23505" ? "linked_elsewhere" : "sign_in_failed",
      { cause: error }
    );
  }
};
