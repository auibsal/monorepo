import { authenticateRequest } from "@repo/auth/verify";
import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { CARD_CODE, checkCard, PassError } from "@/lib/api/pass";
import { passConfig } from "@/lib/api/pass-config";

export const OPTIONS = preflight;

const body = z.object({ code: z.string().trim().regex(CARD_CODE) });

/**
 * POST /pass/card `{ code }`: an officer at the door or on the Typewriter
 * Tour scanned a member's IDEA Pass. The IDEA says whether the card is live
 * (only SAL's server holds the secret that asks); if it names a SAL
 * account, the scan is recorded for this officer, and their own session
 * then spends it (events.check_in_pass, programmes.*_six_words_pass), where
 * the permissions are checked as before. Answers `{ status: "ok", scan,
 * full_name_en, full_name_ar }`, `{ status: "not_live" }` or `{ status:
 * "not_member" }` (a live Pass that has never signed in to SAL).
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = (data: object, status = 200) =>
    NextResponse.json(data, { headers, status });

  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }
  const config = passConfig();
  if (!config) {
    return json({ error: "not_configured" }, 503);
  }
  const allowed = await session.supabase
    .schema("access")
    .rpc("can_scan_passes");
  if (allowed.data !== true) {
    return json({ error: "forbidden" }, 403);
  }
  const parsed = body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return json({ error: "invalid_body" }, 400);
  }
  try {
    const holder = await checkCard(config.issuer, config, parsed.data.code);
    if (!holder) {
      return json({ status: "not_live" });
    }
    if (!holder.sub) {
      return json({ status: "not_member" });
    }
    const { data, error } = await createAdminClient()
      .schema("access")
      .rpc("record_pass_scan", {
        pass_sub: holder.sub,
        scanned_by: session.userId,
      });
    if (error) {
      throw error;
    }
    const scan = data?.[0];
    return scan
      ? json({
          full_name_ar: scan.full_name_ar,
          full_name_en: scan.full_name_en,
          scan: scan.scan,
          status: "ok",
        })
      : json({ status: "not_member" });
  } catch (error) {
    if (error instanceof PassError) {
      return json(
        { error: error.code },
        error.code === "rate_limited" ? 429 : 502
      );
    }
    log.error(`IDEA Pass card check failed: ${parseError(error)}`);
    return json({ error: "card_check_failed" }, 500);
  }
};
