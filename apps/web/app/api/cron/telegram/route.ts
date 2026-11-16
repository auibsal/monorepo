import { env } from "@/env";
import { hasBearer } from "@/lib/api/bearer";
import { sharedBot } from "@/lib/api/bot/bot";
import { db } from "@/lib/api/bot/db";
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
import { runSteps } from "@/lib/api/steps";
import { runWatch } from "@/lib/api/watch";

export const maxDuration = 60;

/** No step starts after 40 seconds, and none runs past 20 or the 45th
 * second: each run ends well inside Vercel's 60. */
const BUDGET_MS = 40_000;
const STEP_MS = 20_000;
const HARD_STOP_MS = 45_000;

/** The steps the last run left, first in line on this one. */
const LEFT_KEY = "telegram.left";

const leftLastTime = async () => {
  const { data } = await db()
    .schema("core")
    .from("settings")
    .select("value")
    .eq("key", LEFT_KEY)
    .maybeSingle();
  return Array.isArray(data?.value) ? (data.value as string[]) : [];
};

const leaveForNextTime = async (before: string[], left: string[]) => {
  // Written only when it changes (each write is in the activity log).
  if (before.join() === left.join()) {
    return;
  }
  await db()
    .schema("core")
    .from("settings")
    .upsert({ key: LEFT_KEY, value: left });
};

/**
 * Every ten minutes (pg_cron `sal-telegram-posts`): the bot's posts to the
 * connected Telegram groups (new events, starting soon, Qirtas, the daily
 * word), the removals a week after Hudhud's warning (decisions.md), each
 * group's join link, role holders' tags and the admins Hudhud makes, the
 * Sunday Paper, tickets on the day and weekly role to-dos in members'
 * chats, the members' group's description (with the next event), the daily checks
 * (domain, certificate, database advisors) and the staff alerts. Does
 * nothing without TELEGRAM_BOT_TOKEN. Each run keeps to a time budget and
 * leaves what it can't reach for the next (lib/api/steps.ts).
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
  const first = await leftLastTime().catch(() => []);
  // The staff alerts first: a slow step later must never hold back the
  // alert about it.
  const outcome = await runSteps(
    [
      { name: "alerts", run: () => runAlerts(bot.api) },
      { name: "feeds", run: () => runFeeds(bot.api, bot.botInfo.username) },
      { name: "removed", run: () => runRemovals(bot.api) },
      { name: "links", run: () => ensureInviteLinks(bot.api) },
      { name: "titles", run: () => runTitles(bot.api) },
      { name: "paper", run: () => runPaper(bot.api) },
      { name: "tickets", run: () => runTickets(bot.api) },
      { name: "todos", run: () => runRoleTodos(bot.api) },
      { name: "descriptions", run: () => syncDescriptions(bot.api) },
      { name: "watch", run: () => runWatch() },
    ],
    {
      budgetMs: BUDGET_MS,
      first,
      hardStopMs: HARD_STOP_MS,
      stepMs: STEP_MS,
    }
  );
  await leaveForNextTime(first, outcome.left).catch(() => undefined);
  const failed = Object.keys(outcome.failed);
  // A failed step answers 500, so the health check sees it (decisions.md,
  // The site: no silent failures); the others still ran.
  return Response.json(
    { ...outcome.done, failed, left: outcome.left },
    { status: failed.length > 0 ? 500 : 200 }
  );
};

export const GET = run;
export const POST = run;
