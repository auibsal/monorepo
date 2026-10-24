import { env } from "@/env";
import { hasBearer } from "@/lib/api/bearer";
import { sharedBot } from "@/lib/api/bot/bot";
import { runFeeds } from "@/lib/api/bot/feeds";

export const maxDuration = 60;

/**
 * Every ten minutes (pg_cron `sal-telegram-posts`): the bot's posts to the
 * connected Telegram groups (new events, starting soon, Waraq, the daily
 * word). Does nothing without TELEGRAM_BOT_TOKEN.
 */
const run = async (request: Request) => {
  if (!hasBearer(request, env.CRON_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!env.TELEGRAM_BOT_TOKEN) {
    return Response.json({ groups: 0, posted: 0, skipped: "no_token" });
  }
  const bot = sharedBot();
  await bot.init();
  return Response.json(await runFeeds(bot.api, bot.botInfo.username));
};

export const GET = run;
export const POST = run;
