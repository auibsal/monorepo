import { env } from "@/env";
import { hasBearer } from "@/lib/api/bearer";
import { sharedBot } from "@/lib/api/bot/bot";
import { runRemovals } from "@/lib/api/bot/features/group/removals";
import { runFeeds } from "@/lib/api/bot/feeds";

export const maxDuration = 60;

/**
 * Every ten minutes (pg_cron `sal-telegram-posts`): the bot's posts to the
 * connected Telegram groups (new events, starting soon, Qirtas, the daily
 * word), and the removals a week after Hudhud's warning (decisions.md). Does nothing without TELEGRAM_BOT_TOKEN.
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
  const feeds = await runFeeds(bot.api, bot.botInfo.username);
  const removed = await runRemovals(bot.api);
  return Response.json({ ...feeds, removed });
};

export const GET = run;
export const POST = run;
