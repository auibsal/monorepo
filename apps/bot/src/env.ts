import { keys as database } from "@repo/database/keys";
import { keys as telegram } from "@repo/telegram/keys";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const SECRET_TOKEN = /^[\w-]{32,256}$/;

const read = () =>
  createEnv({
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    extends: [database(), telegram()],
    runtimeEnv: {
      CRON_SECRET: process.env.CRON_SECRET,
      TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
      TELEGRAM_WEBHOOK_URL: process.env.TELEGRAM_WEBHOOK_URL,
      VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    },
    server: {
      // The database's scheduled jobs send it as a Bearer token (Vault:
      // cron_secret, the same value as on apps/api). Also guards /api/setup.
      CRON_SECRET: z.string().min(32).optional(),
      // Telegram sends it with every update (X-Telegram-Bot-Api-Secret-Token).
      // `openssl rand -hex 32`. Updates without it are refused.
      TELEGRAM_WEBHOOK_SECRET: z.string().regex(SECRET_TOKEN).optional(),
      // Where Telegram delivers updates. Defaults to the production domain
      // Vercel gives the project, plus /api/telegram.
      TELEGRAM_WEBHOOK_URL: z.url().optional(),
      // Set by Vercel.
      VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  });

let cached: ReturnType<typeof read> | undefined;

/** The environment, read once per instance. */
export const env = () => {
  cached ??= read();
  return cached;
};

export const webhookUrl = () => {
  const { TELEGRAM_WEBHOOK_URL, VERCEL_PROJECT_PRODUCTION_URL } = env();
  if (TELEGRAM_WEBHOOK_URL) {
    return TELEGRAM_WEBHOOK_URL;
  }
  return VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${VERCEL_PROJECT_PRODUCTION_URL}/api/telegram`
    : undefined;
};
