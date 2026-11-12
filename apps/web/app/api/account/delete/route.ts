import { createAdminClient } from "@repo/database/admin";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { respond } from "@/lib/api/problem";
import { authenticateRequest, signedInWithin } from "@/lib/auth/verify";
import { parseError } from "@/lib/observability/error";
import { log } from "@/lib/observability/log";

export const OPTIONS = preflight;

/** How recent the sign-in must be to delete the account (decisions §11). */
const REAUTH_MINUTES = 15;

/** How long a deleted account waits, in case its owner changes their mind. */
const GRACE_DAYS = 30;

/**
 * Deletes the caller's account (Settings) 30 days from now (decisions.md,
 * Members): signing in before then restores it, and the retention job
 * deletes it after. Only on a fresh sign-in: a session older than fifteen
 * minutes is asked to sign in again first ("reauthenticate").
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
    const admin = createAdminClient();
    const now = new Date();
    const { error } = await admin
      .schema("core")
      .from("profiles")
      .update({ deletion_requested_at: now.toISOString() })
      .eq("id", session.userId);
    if (error) {
      throw error;
    }
    const deletesOn = new Date(
      now.getTime() + GRACE_DAYS * 86_400_000
    ).toISOString();
    await admin
      .schema("core")
      .from("outbox")
      .insert({
        kind: "account.deletion_scheduled",
        payload: { deletes_on: deletesOn, user_id: session.userId },
      });
    log.info("Account deletion requested");
    return json({ deletesOn, ok: true });
  } catch (error) {
    log.error(`Account deletion failed: ${parseError(error)}`);
    return json({ error: "deletion_failed" }, 500);
  }
};
