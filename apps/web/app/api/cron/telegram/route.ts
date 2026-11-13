import { env } from "@/env";
import { hasBearer } from "@/lib/api/bearer";
import { sharedBot } from "@/lib/api/bot/bot";
import { runRemovals } from "@/lib/api/bot/features/group/removals";
import { runFeeds } from "@/lib/api/bot/feeds";
import { ensureInviteLinks, runTitles } from "@/lib/api/bot/titles";
import {
  runAlerts,
  runPaper,
  runRoleTodos,
  runTickets,
  syncDescriptions,
} from "@/lib/api/bot/upkeep";
import { problem } from "@/lib/api/problem";
import { runWatch } from "@/lib/api/watch";

export const maxDuration = 60;

/**
 * Every ten minutes (pg_cron `sal-telegram-posts`): the bot's posts to the
 * connected Telegram groups (new events, starting soon, Qirtas, the daily
 * word), the removals a week after Hudhud's warning (decisions.md), each
 * group's join link, role holders' tags and the admins Hudhud makes, the
 * Sunday Paper, tickets on the day and weekly role to-dos in members'
 * chats, the members' group's description (with the next event), the daily checks
 * (domain, certificate, database advisors) and the staff alerts. Does
 * nothing without TELEGRAM_BOT_TOKEN.
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
  const paper = await runPaper(bot.api);
  const tickets = await runTickets(bot.api);
  const todos = await runRoleTodos(bot.api);
  await syncDescriptions(bot.api);
  await runWatch();
  const alerts = await runAlerts(bot.api);
  return Response.json({
    ...feeds,
    alerts,
    links,
    paper,
    removed,
    tickets,
    titles,
    todos,
  });
};

export const GET = run;
export const POST = run;
