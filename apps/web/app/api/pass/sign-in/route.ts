import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { discover, exchangeCode, PassError } from "@/lib/api/pass";
import {
  createWithPass,
  PassAccountError,
  readTicket,
  signInWithPass,
} from "@/lib/api/pass-account";
import { isReturnPage, passConfig } from "@/lib/api/pass-config";

export const maxDuration = 30;
export const OPTIONS = preflight;

// RFC 7636: verifiers are 43–128 unreserved characters.
const VERIFIER = /^[\w.~-]{43,128}$/;

const body = z.union([
  z.object({
    code: z.string().min(1).max(2048),
    codeVerifier: z.string().regex(VERIFIER),
    nonce: z.string().min(16).max(128),
    redirectUri: z.string().url(),
  }),
  z.object({
    create: z.literal(true),
    locale: z.enum(["ar", "en"]),
    ticket: z.string().min(1).max(4096),
  }),
]);

/**
 * POST /pass/sign-in, on the way back from The IDEA Pass. With `{ code,
 * codeVerifier, nonce, redirectUri }` it verifies the Pass's id_token and
 * answers a one-time token for the SAL account linked to (or found for)
 * that Pass, or a ticket when there is none. With `{ ticket, create }` it
 * makes the account the ticket describes.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = (data: object, status = 200) =>
    NextResponse.json(data, { headers, status });

  const config = passConfig();
  if (!config) {
    return json({ error: "not_configured" }, 503);
  }
  const parsed = body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return json({ error: "invalid_body" }, 400);
  }
  const admin = createAdminClient();
  try {
    if ("ticket" in parsed.data) {
      const identity = await readTicket(
        parsed.data.ticket,
        config.clientSecret
      );
      if (!identity) {
        return json({ error: "expired" }, 400);
      }
      return json(await createWithPass(admin, identity, parsed.data.locale));
    }
    if (!isReturnPage(parsed.data.redirectUri)) {
      return json({ error: "invalid_body" }, 400);
    }
    const identity = await exchangeCode(await discover(config.issuer), {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      ...parsed.data,
    });
    return json(await signInWithPass(admin, identity, config.clientSecret));
  } catch (error) {
    if (error instanceof PassError || error instanceof PassAccountError) {
      return json({ error: error.code }, 400);
    }
    log.error(`IDEA Pass sign-in failed: ${parseError(error)}`);
    return json({ error: "sign_in_failed" }, 500);
  }
};
