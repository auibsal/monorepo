import "server-only";

import { log } from "@repo/observability/log";
import { env } from "@/env";
import { visitorOf } from "./rate-limit";

const VERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Checks a Cloudflare Turnstile token from a public form (audit C11): one
 * use per token, bound to the visitor's address. Without the secret
 * (local development, CI) there is no check, as the widget shows none.
 */
export const isHuman = async (
  request: Request,
  token: string | null | undefined
): Promise<boolean> => {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return true;
  }
  if (!token) {
    return false;
  }
  try {
    const response = await fetch(VERIFY, {
      body: new URLSearchParams({
        remoteip: visitorOf(request),
        response: token,
        secret,
      }),
      method: "POST",
    });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch (error) {
    log.warn(`Turnstile not checked: ${String(error)}`);
    return false;
  }
};
