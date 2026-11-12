import { env } from "@/env";
import { hasBearer } from "@/lib/api/bearer";
import { sharedBot } from "@/lib/api/bot/bot";
import { runRemovals } from "@/lib/api/bot/features/group/removals";
import { runFeeds } from "@/lib/api/bot/feeds";
import { ensureInviteLinks, runTitles } from "@/lib/api/bot/titles";
import { problem } from "@/lib/api/problem";

export const maxDuration = 60;

/**
 * Every ten minutes (pg_cron `sal-telegram-posts`): the bot's posts to the
 * connected Telegram groups (new events, starting soon, Qirtas, the daily
 * word), the removals a week after Hudhud's warning (decisions.md), each
 * group's join link, and role holders' admin titles. Does nothing without
 * TELEGRAM_BOT_TOKEN.
 */
const run = async (request: Request) => {
  if (!hasBearer(request, env.CRON_SECRET)) {
    return problem(401, "unauthorized");
  }
  if (!env.TELEGRAM_BOT_TOKEN) {
    return Response.json({ groups: 0, posted: 0, skipped: "no_token" });
  }
  const bot = sharedBot();
  await bot.init();
  const feeds = await runFeeds(bot.api, bot.botInfo.username);
  const removed = await runRemovals(bot.api);
  const links = await ensureInviteLinks(bot.api);
  const titles = await runTitles(bot.api);
  return Response.json({ ...feeds, links, removed, titles });
};

export const GET = run;
export const POST = run;
