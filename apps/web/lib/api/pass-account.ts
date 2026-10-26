import type { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { jwtVerify, SignJWT } from "jose";
import type { PassIdentity } from "./pass";

type Admin = ReturnType<typeof createAdminClient>;

const AUIB = /@auib\.edu\.iq$/i;
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

/**
 * A student whose account still signs in with another address moves to the
 * AUIB address the Pass has checked: membership, ballots and the Council's
 * checks all read the account's address. Left as it is when another
 * account already has that address.
 */
const moveToAuibAddress = async (
  admin: Admin,
  userId: string,
  current: string,
  auibEmail: string | null
) => {
  if (!auibEmail || AUIB.test(current)) {
    return current;
  }
  const { error } = await admin.auth.admin.updateUserById(userId, {
    email: auibEmail,
    email_confirm: true,
  });
  if (error) {
    log.warn(`IDEA Pass: AUIB address not moved: ${parseError(error)}`);
    return current;
  }
  return auibEmail;
};

const signInTo = async (
  admin: Admin,
  userId: string,
  identity: PassIdentity
) => {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  const email = data?.user?.email;
  if (error || !email) {
    throw new PassAccountError("sign_in_failed", { cause: error });
  }
  const address = await moveToAuibAddress(
    admin,
    userId,
    email,
    identity.auibEmail
  );
  return sessionToken(admin, address);
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
      auib_email: identity.auibEmail ?? undefined,
      pass_sub: identity.sub,
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
      email: identity.auibEmail ?? identity.email,
      status: "unmatched",
      ticket: await issueTicket(identity, secret),
    };
  }
  return {
    status: "signed_in",
    tokenHash: await signInTo(admin, userId, identity),
  };
};

/**
 * A new SAL account for someone the Pass knows: its address is the AUIB one
 * the Pass checked (a student: a member at once) or the Pass's verified
 * address (the Council confirms it, as before). Setup asks for the rest.
 */
export const createWithPass = async (
  admin: Admin,
  identity: PassIdentity,
  locale: "ar" | "en"
): Promise<PassSignIn> => {
  const email = identity.auibEmail ?? identity.email;
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
  await linkPass(admin, identity.sub, userId);
  return { status: "signed_in", tokenHash: await sessionToken(admin, email) };
};

/** Links the Pass to an account (just made, or just signed in to). */
export const linkPass = async (admin: Admin, sub: string, userId: string) => {
  const { error } = await admin
    .schema("access")
    .rpc("pass_link", { pass_sub: sub, user_id: userId });
  if (error) {
    throw new PassAccountError(
      error.code === "23505" ? "linked_elsewhere" : "sign_in_failed",
      { cause: error }
    );
  }
};
