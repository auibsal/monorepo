import type { IncomingMessage, ServerResponse } from "node:http";
import { webhookCallback } from "grammy";
import { sharedBot } from "../bot";
import { env } from "../env";
import { type Handler, sendJson } from "../http";

let callback: Handler | undefined;

/**
 * POST /api/telegram: updates from Telegram. The secret token Telegram
 * sends with every update is checked by grammY; anything else gets 401.
 * An update that takes too long is answered anyway so Telegram does not
 * send it again while it is still being handled.
 */
export default async (req: IncomingMessage, res: ServerResponse) => {
  const secretToken = env().TELEGRAM_WEBHOOK_SECRET;
  if (req.method !== "POST" || !secretToken) {
    sendJson(res, req.method === "POST" ? 503 : 405, { ok: false });
    return;
  }
  callback ??= webhookCallback(sharedBot(), "http", {
    onTimeout: "return",
    secretToken,
    timeoutMilliseconds: 25_000,
  }) as Handler;
  await callback(req, res);
};
