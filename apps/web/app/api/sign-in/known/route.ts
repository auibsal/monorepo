import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { corsHeaders, preflight } from "@/lib/api/cors";

export const OPTIONS = preflight;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Whether an address has an account (owner, Oct 31, 2026: signing in says
 * "no account with this address" rather than only "wrong password"). Asked
 * only after a sign-in fails; answers nothing but yes or no.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = (data: object, status = 200) =>
    NextResponse.json(data, { headers, status });
  const body = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!EMAIL.test(email) || email.length > 320) {
    return json({ error: "invalid_email" }, 400);
  }
  try {
    const { data, error } = await createAdminClient()
      .schema("core")
      .rpc("account_exists", { email });
    if (error) {
      throw error;
    }
    return json({ known: Boolean(data) });
  } catch (error) {
    log.error(`Account check failed: ${parseError(error)}`);
    return json({ error: "failed" }, 500);
  }
};
