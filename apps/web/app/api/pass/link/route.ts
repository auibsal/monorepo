import { authenticateRequest } from "@repo/auth/verify";
import { createAdminClient } from "@repo/database/admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { linkPass, PassAccountError, readTicket } from "@/lib/api/pass-account";
import { passConfig } from "@/lib/api/pass-config";

export const OPTIONS = preflight;

const body = z.object({ ticket: z.string().min(1).max(4096) });

/**
 * POST /pass/link: someone whose account is under an address the Pass
 * doesn't know has just signed in to it the old way; this links their
 * Pass (from the ticket the sign-in gave them) to that account, so every
 * later sign-in goes through the Pass.
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
  const parsed = body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return json({ error: "invalid_body" }, 400);
  }
  const identity = await readTicket(parsed.data.ticket, config.clientSecret);
  if (!identity) {
    return json({ error: "expired" }, 400);
  }
  try {
    await linkPass(createAdminClient(), identity, session.userId);
    return json({ linked: true });
  } catch (error) {
    if (error instanceof PassAccountError) {
      return json({ error: error.code }, 400);
    }
    throw error;
  }
};
