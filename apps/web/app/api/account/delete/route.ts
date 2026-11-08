import { authenticateRequest, signedInWithin } from "@repo/auth/verify";
import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { deleteAccount } from "@/lib/api/deletion";
import { respond } from "@/lib/api/problem";

export const OPTIONS = preflight;

/** How recent the sign-in must be to delete the account (decisions §11). */
const REAUTH_MINUTES = 15;

/**
 * Permanently deletes the caller's account (Settings). Only on a fresh
 * sign-in: a session older than fifteen minutes is asked to sign in again
 * first ("reauthenticate").
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = respond(headers);

  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!signedInWithin(session.claims, REAUTH_MINUTES)) {
    return json({ error: "reauthenticate" }, 403);
  }

  try {
    await deleteAccount(createAdminClient(), session.userId);
    log.info("Account deleted");
    return json({ ok: true });
  } catch (error) {
    log.error(`Account deletion failed: ${parseError(error)}`);
    return json({ error: "deletion_failed" }, 500);
  }
};
