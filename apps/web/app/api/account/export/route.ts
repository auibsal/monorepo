import { authenticateRequest } from "@repo/auth/verify";
import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { exportAccount } from "@/lib/api/account-export";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { problem } from "@/lib/api/problem";

export const OPTIONS = preflight;

/**
 * "Download your data" (Settings, decisions §11): the caller's own records
 * as one JSON file. Only for the person themselves; never cached.
 */
export const POST = async (request: Request) => {
  const headers = { ...corsHeaders(request), "Cache-Control": "no-store" };
  const session = await authenticateRequest(request);
  if (!session) {
    return problem(401, "unauthorized", headers);
  }
  try {
    const data = await exportAccount(createAdminClient(), session.userId);
    log.info("Account data exported");
    return NextResponse.json(data, { headers });
  } catch (error) {
    log.error(`Account export failed: ${parseError(error)}`);
    return problem(500, "export_failed", headers);
  }
};
