import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Telegram usernames: 5–32 letters, digits and underscores; bots end in "bot".
const USERNAME = /^[A-Za-z][A-Za-z0-9_]{3,30}bot$/i;
const TOKEN = /^\d+:[\w-]{30,}$/;
const SECRET_TOKEN = /^[\w-]{32,256}$/;

export const keys = () =>
  createEnv({
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    runtimeEnv: {
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
      TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME,
      TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
    },
    server: {
      // From @BotFather. Server-only: apps/api. Without it the
      // bot does nothing and notices go by email and push only.
      TELEGRAM_BOT_TOKEN: z.string().regex(TOKEN).optional(),
      // The bot's username without the @, for links (t.me/<username>).
      TELEGRAM_BOT_USERNAME: z.string().regex(USERNAME).optional(),
      // Telegram sends it with every update (X-Telegram-Bot-Api-Secret-Token);
      // updates without it are refused. `openssl rand -hex 32`.
      TELEGRAM_WEBHOOK_SECRET: z.string().regex(SECRET_TOKEN).optional(),
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  });
