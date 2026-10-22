import { webhookCallback } from "grammy";
import { env } from "@/env";
import { sharedBot } from "@/lib/bot/bot";

export const maxDuration = 30;

let handle: ((request: Request) => Promise<Response>) | undefined;

/**
 * POST /telegram: updates from Telegram for Hudhud, the Society's bot
 * (lib/bot). grammY checks the secret token Telegram sends with every
 * update and refuses anything without it. An update that takes too long is
 * answered anyway, so Telegram does not send it again meanwhile.
 */
export const POST = (request: Request) => {
  const secretToken = env.TELEGRAM_WEBHOOK_SECRET;
  if (!(secretToken && env.TELEGRAM_BOT_TOKEN)) {
    return Response.json({ ok: false }, { status: 503 });
  }
  handle ??= webhookCallback(sharedBot(), "std/http", {
    onTimeout: "return",
    secretToken,
    timeoutMilliseconds: 25_000,
  });
  return handle(request);
};
