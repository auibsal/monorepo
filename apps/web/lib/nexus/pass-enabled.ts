import { clientEnv as env } from "@/env.client";

/**
 * The IDEA Pass (owner, 2026-10-26): once SAL is registered there, it is
 * the only way to sign in, and where students prove their AUIB address.
 * Until both public values are set, the email sign-in stays.
 */
export const passEnabled = Boolean(
  env.NEXT_PUBLIC_PASS_ISSUER && env.NEXT_PUBLIC_PASS_CLIENT_ID
);

/** The member's live Pass card, with the code that changes every 30 seconds. */
export const PASS_CARD_URL = "https://theideaiq.com/pass";
