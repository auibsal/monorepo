import type { IncomingMessage, ServerResponse } from "node:http";
import { sharedBot } from "../bot";
import { env, webhookUrl } from "../env";
import { hasBearer, sendJson } from "../http";
import { configure } from "../setup";

/**
 * POST /api/setup (Bearer CRON_SECRET): points Telegram at this deployment
 * and sets the commands and profile texts. Run once after the first deploy
 * and again whenever the commands change.
 */
export default async (req: IncomingMessage, res: ServerResponse) => {
  if (!hasBearer(req.headers.authorization, env().CRON_SECRET)) {
    sendJson(res, 401, { ok: false });
    return;
  }
  const url = webhookUrl();
  if (!url) {
    sendJson(res, 500, { error: "no_webhook_url", ok: false });
    return;
  }
  const info = await configure(sharedBot().api, {
    secretToken: env().TELEGRAM_WEBHOOK_SECRET,
    url,
  });
  sendJson(res, 200, {
    ok: true,
    pending: info.pending_update_count,
    url: info.url,
  });
};
