import { authenticateRequest } from "@repo/auth/verify";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { hasBearer } from "@/lib/api/bearer";
import { sharedBot } from "@/lib/api/bot/bot";
import { configure } from "@/lib/api/bot/setup";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { hasPermission } from "@/lib/api/permissions";
import { api } from "@/lib/api/urls";

export const maxDuration = 30;
export const OPTIONS = preflight;

const body = z.object({ connect: z.boolean().default(false) });

const webhookUrl = () => api("/telegram");

/**
 * POST /telegram/setup, for Administration → Settings → Telegram (settings
 * managers) or with Bearer CRON_SECRET. `{ connect: true }` points Telegram
 * at <api>/telegram and sets the bot's commands and profile texts in both
 * languages; without it, it only reports whether the bot is set up and
 * connected. Run it once after the token is added, and again whenever the
 * commands change.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = (data: object, status = 200) =>
    NextResponse.json(data, { headers, status });

  if (!hasBearer(request, env.CRON_SECRET)) {
    const session = await authenticateRequest(request);
    if (!session) {
      return json({ error: "unauthorized" }, 401);
    }
    if (!(await hasPermission(session, "settings.manage"))) {
      return json({ error: "forbidden" }, 403);
    }
  }
  const parsed = body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return json({ error: "invalid_body" }, 400);
  }

  const configured = Boolean(
    env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_WEBHOOK_SECRET
  );
  if (!configured) {
    return json({
      configured,
      missing: [
        env.TELEGRAM_BOT_TOKEN ? null : "TELEGRAM_BOT_TOKEN",
        env.TELEGRAM_BOT_USERNAME ? null : "TELEGRAM_BOT_USERNAME",
        env.TELEGRAM_WEBHOOK_SECRET ? null : "TELEGRAM_WEBHOOK_SECRET",
      ].filter(Boolean),
    });
  }
  const { api: telegram } = sharedBot();
  try {
    const info = parsed.data.connect
      ? await configure(telegram, {
          secretToken: env.TELEGRAM_WEBHOOK_SECRET,
          url: webhookUrl(),
        })
      : await telegram.getWebhookInfo();
    return json({
      configured,
      connected: info.url === webhookUrl(),
      lastError: info.last_error_message ?? null,
      pending: info.pending_update_count,
    });
  } catch {
    // Most often a mistyped token: Telegram answers 401.
    return json({ configured, error: "telegram_refused" }, 502);
  }
};
