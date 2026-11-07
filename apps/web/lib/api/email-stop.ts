import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { keys } from "@repo/database/keys";

/**
 * A member's "stop these emails" link (the Sunday Paper's footer and
 * List-Unsubscribe): `<user id>.<signature>`, signed with a key derived
 * from the server's secret, so it needs no stored token and can't be
 * forged for someone else. It turns off notify_email: the Sunday Paper and
 * reminders for events booked. Emails about the member's own requests,
 * work and account still come.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const sign = (userId: string) =>
  createHmac("sha256", `sal-email-stop:${keys().SUPABASE_SECRET_KEY ?? ""}`)
    .update(userId)
    .digest("base64url");

export const stopToken = (userId: string) => `${userId}.${sign(userId)}`;

/** The member a stop token names, or null if it isn't one we signed. */
export const stopTokenUser = (token: string) => {
  const [userId = "", signature = ""] = token.split(".");
  if (!(UUID.test(userId) && keys().SUPABASE_SECRET_KEY)) {
    return null;
  }
  const expected = Buffer.from(sign(userId));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given)
    ? userId
    : null;
};

const signInvite = (email: string) =>
  createHmac("sha256", `sal-invite-stop:${keys().SUPABASE_SECRET_KEY ?? ""}`)
    .update(email)
    .digest("base64url");

/**
 * The stop link of the one-time invitation (owner, Nov 7, 2026): the address
 * (base64url) and its signature. Stopping takes the address off the
 * invitation list, so nothing more is sent to it.
 */
export const inviteStopToken = (email: string) =>
  `${Buffer.from(email).toString("base64url")}.${signInvite(email)}`;

/** The address an invitation stop token names, or null. */
export const inviteStopEmail = (token: string) => {
  const [encoded = "", signature = ""] = token.split(".");
  const email = Buffer.from(encoded, "base64url").toString("utf8");
  if (!(email.includes("@") && keys().SUPABASE_SECRET_KEY)) {
    return null;
  }
  const expected = Buffer.from(signInvite(email));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given)
    ? email
    : null;
};
