import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { authorizeUrl, discover } from "@/lib/api/pass";
import { isReturnPage, passConfig } from "@/lib/api/pass-config";

export const OPTIONS = preflight;

// An S256 challenge is 43 base64url characters (RFC 7636).
const CHALLENGE = /^[\w-]{43}$/;

const body = z.object({
  codeChallenge: z.string().regex(CHALLENGE),
  locale: z.enum(["ar", "en"]),
  nonce: z.string().min(16).max(128),
  redirectUri: z.string().url(),
  state: z.string().min(16).max(128),
});

/**
 * POST /pass/start: the address of The IDEA Pass's sign-in for this
 * browser's PKCE challenge, state and nonce, or `{ url: null }` while the
 * Pass isn't set up (the email sign-in then stays).
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = (data: object, status = 200) =>
    NextResponse.json(data, { headers, status });

  const parsed = body.safeParse(await request.json().catch(() => ({})));
  if (!(parsed.success && isReturnPage(parsed.data.redirectUri))) {
    return json({ error: "invalid_body" }, 400);
  }
  const config = passConfig();
  if (!config) {
    return json({ url: null });
  }
  try {
    const discovery = await discover(config.issuer);
    return json({
      url: authorizeUrl(discovery, {
        clientId: config.clientId,
        ...parsed.data,
      }),
    });
  } catch {
    return json({ error: "unavailable" }, 503);
  }
};
