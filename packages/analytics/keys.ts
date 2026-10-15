import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const GATEWAY_PATH = /^\/[a-z0-9][a-z0-9/_-]*$/;
const PURPOSE_ID = /^[A-Za-z0-9_-]{1,40}$/;

export const keys = () =>
  createEnv({
    client: {
      // GA4 measurement ID (G-…). With GTM set, GA4 is configured inside the
      // container instead and this only says that analytics is on.
      NEXT_PUBLIC_GA_ID: z.string().startsWith("G-").optional(),
      // Google Tag Manager container (GTM-…). Public site only.
      NEXT_PUBLIC_GTM_ID: z.string().startsWith("GTM-").optional(),
      // The Google tag gateway's measurement path on auibsal.org, set up in
      // Cloudflare (for example "/metrics"). Unset: scripts load from Google.
      NEXT_PUBLIC_TAG_GATEWAY_PATH: z.string().regex(GATEWAY_PATH).optional(),
      // The Zaraz consent purpose ID for analytics (Cloudflare → Zaraz →
      // Consent). Unset: analytics consent stays denied.
      NEXT_PUBLIC_ZARAZ_ANALYTICS_PURPOSE: z
        .string()
        .regex(PURPOSE_ID)
        .optional(),
    },
    emptyStringAsUndefined: true,
    runtimeEnv: {
      NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
      NEXT_PUBLIC_GTM_ID: process.env.NEXT_PUBLIC_GTM_ID,
      NEXT_PUBLIC_TAG_GATEWAY_PATH: process.env.NEXT_PUBLIC_TAG_GATEWAY_PATH,
      NEXT_PUBLIC_ZARAZ_ANALYTICS_PURPOSE:
        process.env.NEXT_PUBLIC_ZARAZ_ANALYTICS_PURPOSE,
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  });
