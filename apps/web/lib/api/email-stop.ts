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
