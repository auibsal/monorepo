import { keys as analytics } from "@repo/analytics/keys";
import { keys as auth } from "@repo/auth/keys";
import { keys as database } from "@repo/database/keys";
import { keys as email } from "@repo/email/keys";
import { envPresets, withPresets } from "@repo/next-config/env";
import { keys as core } from "@repo/next-config/keys";
import { keys as observability } from "@repo/observability/keys";
import { keys as security } from "@repo/security/keys";
import { keys as telegram } from "@repo/telegram/keys";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const presets = envPresets(
  analytics(),
  auth(),
  core(),
  database(),
  email(),
  observability(),
  security(),
  telegram()
);

/**
 * The one app's environment. Server keys (the Supabase secret key, Resend,
 * the shared secrets below) are read only in route handlers and lib/api;
 * client components import `@/env.client` instead, so the server names never
 * reach the browser bundle (CI greps for them).
 */
export const env = withPresets(
  createEnv({
    client: {
      // Web Push: the public half of the VAPID pair; the private half is
      // server-only below.
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(80).optional(),
    },
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    extends: presets,
    runtimeEnv: {
      CRON_SECRET: process.env.CRON_SECRET,
      DATABASE_WEBHOOK_SECRET: process.env.DATABASE_WEBHOOK_SECRET,
      GOOGLE_WALLET_ISSUER_ID: process.env.GOOGLE_WALLET_ISSUER_ID,
      GOOGLE_WALLET_PRIVATE_KEY: process.env.GOOGLE_WALLET_PRIVATE_KEY,
      GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL:
        process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      NOTION_TOKEN: process.env.NOTION_TOKEN,
      PASS_CLIENT_SECRET: process.env.PASS_CLIENT_SECRET,
      REVALIDATE_SECRET: process.env.REVALIDATE_SECRET,
      VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    },
    server: {
      // Shared secret Vercel Cron sends as a Bearer token. Generate with
      // `openssl rand -hex 32`. Cron routes reject every request when unset.
      CRON_SECRET: z.string().min(32).optional(),
      // Sent by the Supabase database webhook (outbox) as a Bearer token.
      DATABASE_WEBHOOK_SECRET: z.string().min(32).optional(),
      // Google Wallet (the membership card as a pass): the issuer id from
      // the Google Pay & Wallet Console and a service account allowed to
      // sign passes for it. Without all three, "Add to Google Wallet" says
      // it isn't available yet. docs/platform/wallet.md.
      GOOGLE_WALLET_ISSUER_ID: z
        .string()
        .regex(/^[0-9]+$/)
        .optional(),
      GOOGLE_WALLET_PRIVATE_KEY: z.string().min(100).optional(),
      GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL: z.email().optional(),
      // The "SAL Platform" connection in the team's Notion workspace (an
      // internal API token). Without it the Notion sync does nothing.
      NOTION_TOKEN: z.string().min(20).optional(),
      // SAL's client secret at The IDEA Pass (with NEXT_PUBLIC_PASS_ISSUER
      // and NEXT_PUBLIC_PASS_CLIENT_ID). docs/platform/idea-pass.md.
      PASS_CLIENT_SECRET: z.string().min(16).optional(),
      // Bearer token for POST /api/revalidate (the outbox handler calls it
      // in-process; the secret stays for calls from elsewhere).
      REVALIDATE_SECRET: z.string().min(32).optional(),
      // Web Push signing key. Without it (or the public key) notices go by
      // email only.
      VAPID_PRIVATE_KEY: z.string().min(40).optional(),
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  }),
  presets
);
