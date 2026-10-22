import type { IncomingMessage, ServerResponse } from "node:http";
import { sharedBot } from "../bot";
import { env } from "../env";
import { runFeeds } from "../feeds";
import { hasBearer, sendJson } from "../http";

/** POST /api/cron: the group posts, every ten minutes from pg_cron. */
export default async (req: IncomingMessage, res: ServerResponse) => {
  if (!hasBearer(req.headers.authorization, env().CRON_SECRET)) {
    sendJson(res, 401, { ok: false });
    return;
  }
  const bot = sharedBot();
  await bot.init();
  sendJson(res, 200, {
    ok: true,
    ...(await runFeeds(bot.api, bot.botInfo.username)),
  });
};
