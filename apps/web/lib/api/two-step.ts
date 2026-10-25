import "server-only";

import { createHmac, randomInt } from "node:crypto";
import type { createAdminClient } from "@repo/database/admin";
import { keys } from "@repo/database/keys";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Getting back into two-step sign-in (owner, 2026-10-25): ten one-time
 * recovery codes, and a reset by whoever can assign roles. Either removes
 * the person's authenticator app, so they set up a new one at once; that new
 * one is what gives the second step again. A passkey stays a first step.
 */

/** How many codes a set has. */
export const RECOVERY_CODE_COUNT = 10;

// Crockford's base32: no I, L, O or U, so a code read aloud or copied by
// hand can't be mistaken. 12 characters are 60 bits each.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const GROUPS = 3;
const GROUP_LENGTH = 4;

const group = () =>
  Array.from(
    { length: GROUP_LENGTH },
    () => ALPHABET[randomInt(ALPHABET.length)]
  ).join("");

/** A new code, "K4M9-X7QP-2AB8". */
export const newRecoveryCode = () =>
  Array.from({ length: GROUPS }, group).join("-");

/** A code as typed: any case, spaces or dashes; O, I and L as 0 and 1. */
export const normalizeRecoveryCode = (code: string) =>
  code
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");

/** What is stored: a hash keyed with the server's secret, never the code. */
export const hashRecoveryCode = (code: string) =>
  createHmac("sha256", `sal-recovery-code:${keys().SUPABASE_SECRET_KEY ?? ""}`)
    .update(normalizeRecoveryCode(code))
    .digest("base64url");

/** Removes every authenticator app from the account. */
export const removeAuthenticators = async (
  admin: AdminClient,
  userId: string
) => {
  const { data, error } = await admin.auth.admin.mfa.listFactors({ userId });
  if (error) {
    throw error;
  }
  const totp = data.factors.filter((factor) => factor.factor_type === "totp");
  await Promise.all(
    totp.map(async (factor) => {
      const removed = await admin.auth.admin.mfa.deleteFactor({
        id: factor.id,
        userId,
      });
      if (removed.error) {
        throw removed.error;
      }
    })
  );
};
