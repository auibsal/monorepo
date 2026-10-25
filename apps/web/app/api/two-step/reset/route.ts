import { authenticateRequest } from "@repo/auth/verify";
import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { hasPermission } from "@/lib/api/permissions";
import { removeAuthenticators } from "@/lib/api/two-step";

export const OPTIONS = preflight;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Resets another person's two-step sign-in (roles.assign, which itself
 * counts only after the caller's own second step): their authenticator app
 * and recovery codes are removed, so they set up new ones at their next
 * sign-in. Recorded, and the person is emailed. Nobody resets their own:
 * that is what recovery codes are for.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = (data: object, status = 200) =>
    NextResponse.json(data, { headers, status });

  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!(await hasPermission(session, "roles.assign"))) {
    return json({ error: "forbidden" }, 403);
  }
  const body = (await request.json().catch(() => ({}))) as {
    userId?: unknown;
  };
  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!UUID.test(userId)) {
    return json({ error: "invalid_user" }, 400);
  }
  if (userId === session.userId) {
    return json({ error: "own_account" }, 400);
  }

  const admin = createAdminClient();
  try {
    await removeAuthenticators(admin, userId);
    const cleared = await admin
      .schema("access")
      .from("recovery_codes")
      .delete()
      .eq("user_id", userId);
    if (cleared.error) {
      throw cleared.error;
    }
    const recorded = await admin
      .schema("access")
      .from("two_step_resets")
      .insert({ reset_by: session.userId, user_id: userId, via: "officer" });
    if (recorded.error) {
      throw recorded.error;
    }
    log.info("Two-step sign-in reset by an officer");
    return json({ ok: true });
  } catch (error) {
    log.error(`Two-step reset failed: ${parseError(error)}`);
    return json({ error: "failed" }, 500);
  }
};
