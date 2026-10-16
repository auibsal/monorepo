import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const GATEWAY_PATH = /^\/[a-z0-9][a-z0-9/_-]*$/;
const ADSENSE_CLIENT = /^ca-pub-\d{16}$/;
const ADSENSE_SLOT = /^\d{6,12}$/;

export const keys = () =>
  createEnv({
    client: {
      // Google AdSense publisher ID (ca-pub-…), for Waraq's ads to visitors
      // who are not signed in. Unset: AdSense never loads.
      NEXT_PUBLIC_ADSENSE_CLIENT: z.string().regex(ADSENSE_CLIENT).optional(),
      // The AdSense display ad unit (its data-ad-slot number).
      NEXT_PUBLIC_ADSENSE_SLOT: z.string().regex(ADSENSE_SLOT).optional(),
      // GA4 measurement ID (G-…). With GTM set, GA4 is configured inside the
      // container instead and this only says that analytics is on.
      NEXT_PUBLIC_GA_ID: z.string().startsWith("G-").optional(),
      // Google Tag Manager container (GTM-…). Public site only.
      NEXT_PUBLIC_GTM_ID: z.string().startsWith("GTM-").optional(),
      // The Google tag gateway's measurement path on auibsal.org, set up in
      // Cloudflare (for example "/metrics"). Unset: scripts load from Google.
      NEXT_PUBLIC_TAG_GATEWAY_PATH: z.string().regex(GATEWAY_PATH).optional(),
    },
    emptyStringAsUndefined: true,
    runtimeEnv: {
      NEXT_PUBLIC_ADSENSE_CLIENT: process.env.NEXT_PUBLIC_ADSENSE_CLIENT,
      NEXT_PUBLIC_ADSENSE_SLOT: process.env.NEXT_PUBLIC_ADSENSE_SLOT,
      NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
      NEXT_PUBLIC_GTM_ID: process.env.NEXT_PUBLIC_GTM_ID,
      NEXT_PUBLIC_TAG_GATEWAY_PATH: process.env.NEXT_PUBLIC_TAG_GATEWAY_PATH,
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  });
