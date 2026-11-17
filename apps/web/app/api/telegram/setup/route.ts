import { z } from "zod";
import { env } from "@/env";
import { hasBearer } from "@/lib/api/bearer";
import { sharedBot } from "@/lib/api/bot/bot";
import { TELEGRAM_TIMEOUT_MS, telegramSignal } from "@/lib/api/bot/membership";
import { configure } from "@/lib/api/bot/setup";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { hasPermission } from "@/lib/api/permissions";
import { respond } from "@/lib/api/problem";
import { api } from "@/lib/api/urls";
import { authenticateRequest } from "@/lib/auth/verify";

export const maxDuration = 15;
export const OPTIONS = preflight;

const body = z.object({ connect: z.boolean().default(false) });

const webhookUrl = () => api("/hooks/telegram");

/**
 * POST /telegram/setup, for the Desk's Connected panel (settings
 * managers) or with Bearer CRON_SECRET. `{ connect: true }` points Telegram
 * at <api>/telegram and sets the bot's commands and profile texts in both
 * languages; without it, it only reports whether the bot is set up and
 * connected. Run it once after the token is added, and again whenever the
 * commands change.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = respond(headers);

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
  return json(...(parsed.data.connect ? await connect() : await status()));
};

type Reply = [body: Record<string, unknown>, status?: number];

/** The status check: one question to Telegram, briefly. */
const status = async (): Promise<Reply> => {
  try {
    const info = await sharedBot().api.getWebhookInfo(telegramSignal());
    return [
      {
        configured: true,
        connected: info.url === webhookUrl(),
        lastError: info.last_error_message ?? null,
        pending: info.pending_update_count,
      },
    ];
  } catch (error) {
    return [{ configured: true, error: telegramError(error) }, 502];
  }
};

/** Connecting: its calls side by side, each with its own timeout. */
const connect = async (): Promise<Reply> => {
  const result = await configure(sharedBot().api, {
    secretToken: env.TELEGRAM_WEBHOOK_SECRET,
    timeoutMs: TELEGRAM_TIMEOUT_MS,
    url: webhookUrl(),
  });
  return [
    {
      configured: true,
      connected: result.info?.url === webhookUrl(),
      failed: result.failed,
      lastError: result.info?.last_error_message ?? null,
      pending: result.info?.pending_update_count ?? null,
    },
    result.failed.length > 0 ? 502 : 200,
  ];
};

/** A refused token (401) or no answer in time. */
const telegramError = (error: unknown) =>
  error instanceof Error && error.name === "TimeoutError"
    ? "telegram_timeout"
    : "telegram_refused";
