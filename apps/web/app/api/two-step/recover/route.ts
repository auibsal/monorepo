import { createAdminClient } from "@repo/database/admin";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { respond } from "@/lib/api/problem";
import { withinRateLimit } from "@/lib/api/rate-limit";
import { hashRecoveryCode, removeAuthenticators } from "@/lib/api/two-step";
import { authenticateRequest } from "@/lib/auth/verify";
import { parseError } from "@/lib/observability/error";
import { log } from "@/lib/observability/log";

export const OPTIONS = preflight;

/**
 * Uses one recovery code, signed in with the first step: the code is spent,
 * the lost authenticator app is removed and the person sets up a new one.
 * The reset is recorded and the person is emailed.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = respond(headers);

  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }
  const body = (await request.json().catch(() => ({}))) as { code?: unknown };
  const code = typeof body.code === "string" ? body.code : "";
  if (code.trim() === "") {
    return json({ error: "invalid_code" }, 400);
  }

  const admin = createAdminClient();
  // Five tries an hour per account (OWASP ASVS 2.2.1); when they run out,
  // the person is emailed once that hour, in case it isn't them.
  const allowed = await withinRateLimit(request, "recovery-code", {
    failClosed: true,
    key: session.userId,
    max: 5,
    windowSeconds: 3600,
  });
  if (!allowed) {
    const alert = await withinRateLimit(request, "recovery-code-alert", {
      key: session.userId,
      max: 1,
      windowSeconds: 3600,
    });
    if (alert) {
      await admin
        .schema("core")
        .from("outbox")
        .insert({
          kind: "access.recovery_attempts",
          payload: { user_id: session.userId },
        });
    }
    return json({ error: "rate_limited" }, 429);
  }
  try {
    // Spent in one statement: a code works once, even if sent twice.
    const spent = await admin
      .schema("access")
      .from("recovery_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", session.userId)
      .eq("code_hash", hashRecoveryCode(code))
      .is("used_at", null)
      .select("id")
      .maybeSingle();
    if (spent.error) {
      throw spent.error;
    }
    if (!spent.data) {
      return json({ error: "invalid_code" }, 400);
    }
    await removeAuthenticators(admin, session.userId);
    const recorded = await admin
      .schema("access")
      .from("two_step_resets")
      .insert({ user_id: session.userId, via: "recovery_code" });
    if (recorded.error) {
      throw recorded.error;
    }
    return json({ ok: true });
  } catch (error) {
    log.error(`Recovery code failed: ${parseError(error)}`);
    return json({ error: "failed" }, 500);
  }
};
