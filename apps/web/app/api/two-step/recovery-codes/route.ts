import { authenticateRequest } from "@repo/auth/verify";
import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { corsHeaders, preflight } from "@/lib/api/cors";
import {
  hashRecoveryCode,
  newRecoveryCode,
  RECOVERY_CODE_COUNT,
} from "@/lib/api/two-step";

export const OPTIONS = preflight;

/**
 * A new set of recovery codes for the caller, shown once. Only on a session
 * that has given the second step (aal2); the old set stops working.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = (data: object, status = 200) =>
    NextResponse.json(data, { headers, status });

  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }
  if (session.claims.aal !== "aal2") {
    return json({ error: "second_step_needed" }, 403);
  }

  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, newRecoveryCode);
  const admin = createAdminClient();
  try {
    const cleared = await admin
      .schema("access")
      .from("recovery_codes")
      .delete()
      .eq("user_id", session.userId);
    if (cleared.error) {
      throw cleared.error;
    }
    const stored = await admin
      .schema("access")
      .from("recovery_codes")
      .insert(
        codes.map((code) => ({
          code_hash: hashRecoveryCode(code),
          user_id: session.userId,
        }))
      );
    if (stored.error) {
      throw stored.error;
    }
    return json({ codes });
  } catch (error) {
    log.error(`Recovery codes failed: ${parseError(error)}`);
    return json({ error: "failed" }, 500);
  }
};
