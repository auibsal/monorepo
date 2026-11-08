import { createAdminClient } from "@repo/database/admin";
import { z } from "zod";
import { env } from "@/env";
import { sharedBot } from "@/lib/api/bot/bot";
import { greetLinked } from "@/lib/api/bot/features/account";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { respond } from "@/lib/api/problem";
import {
  authorizeUrl,
  exchangeCode,
  TelegramLoginError,
} from "@/lib/api/telegram-login";
import { authenticateRequest } from "@/lib/auth/verify";
import { parseError } from "@/lib/observability/error";
import { log } from "@/lib/observability/log";
import { botIdFromToken, TELEGRAM_LINK_PAGE } from "@/lib/telegram";

export const maxDuration = 30;
export const OPTIONS = preflight;

// RFC 7636: verifiers are 43–128 unreserved characters; an S256 challenge
// is 43 base64url characters.
const VERIFIER = /^[\w.~-]{43,128}$/u;
const CHALLENGE = /^[\w-]{43}$/u;

const body = z.union([
  z.object({
    codeChallenge: z.string().regex(CHALLENGE),
    redirectUri: z.string().url(),
    state: z.string().min(16).max(128),
  }),
  z.object({
    code: z.string().min(1).max(512),
    codeVerifier: z.string().regex(VERIFIER),
    redirectUri: z.string().url(),
  }),
]);

/** Telegram returns the member to their settings page, in either language. */
const isProfilePage = (redirectUri: string) => {
  const url = new URL(redirectUri);
  return (
    url.origin === new URL(env.NEXT_PUBLIC_SITE_URL).origin &&
    (url.pathname === TELEGRAM_LINK_PAGE ||
      url.pathname === `/ar${TELEGRAM_LINK_PAGE}`) &&
    !url.search &&
    !url.hash
  );
};

/**
 * POST /telegram/link: a signed-in member links Telegram with Telegram's
 * login (it never signs anyone in to the Diwan). With `{ codeChallenge,
 * state, redirectUri }` it answers the address to send them to, or
 * `{ url: null }` when the login isn't set up (the Diwan then uses the
 * bot's one-time code). With `{ code, codeVerifier, redirectUri }` on their
 * way back, it verifies Telegram's id_token and links that account.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = respond(headers);

  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }
  const parsed = body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return json({ error: "invalid_body" }, 400);
  }
  const token = env.TELEGRAM_BOT_TOKEN;
  const clientSecret = env.TELEGRAM_LOGIN_CLIENT_SECRET;
  // Without Telegram's login the page falls back to the bot's one-time
  // code, whatever page it is on (HUD-1).
  if (!(token && clientSecret)) {
    return "code" in parsed.data
      ? json({ error: "not_configured" }, 503)
      : json({ url: null });
  }
  if (!isProfilePage(parsed.data.redirectUri)) {
    return json({ error: "invalid_body" }, 400);
  }
  const clientId = botIdFromToken(token);
  if (!("code" in parsed.data)) {
    return json({ url: authorizeUrl({ clientId, ...parsed.data }) });
  }

  try {
    const identity = await exchangeCode({
      clientId,
      clientSecret,
      ...parsed.data,
    });
    const { error } = await createAdminClient()
      .schema("core")
      .rpc("telegram_link_account", {
        telegram_id: identity.telegramId,
        user_id: session.userId,
        username: identity.username ?? undefined,
      });
    if (error) {
      throw error;
    }
    await greetLinked(sharedBot().api, identity.telegramId).catch((err) =>
      log.warn(`Telegram greeting failed: ${parseError(err)}`)
    );
    return json({ linked: true, username: identity.username });
  } catch (error) {
    if (error instanceof TelegramLoginError) {
      return json({ error: error.code }, 400);
    }
    log.error(`Telegram link failed: ${parseError(error)}`);
    return json({ error: "link_failed" }, 500);
  }
};
