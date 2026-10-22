import { project } from "@repo/config";
import { env } from "@/env";
import { hasBearer } from "@/lib/bearer";
import { sharedBot } from "@/lib/bot/bot";
import { configure } from "@/lib/bot/setup";

export const maxDuration = 30;

const TRAILING_SLASH = /\/$/;

/**
 * POST /telegram/setup (Bearer CRON_SECRET): points Telegram at
 * <api>/telegram and sets the bot's commands and profile texts in both
 * languages. Run once after the first deploy with the token, and again
 * whenever the commands change.
 */
export const POST = async (request: Request) => {
  if (!hasBearer(request, env.CRON_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_WEBHOOK_SECRET)) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }
  const info = await configure(sharedBot().api, {
    secretToken: env.TELEGRAM_WEBHOOK_SECRET,
    url: `${(env.NEXT_PUBLIC_API_URL ?? project.hosts.api).replace(TRAILING_SLASH, "")}/telegram`,
  });
  return Response.json({ pending: info.pending_update_count, url: info.url });
};
