import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    client: {
      // The one site's origin: https://auibsal.org in production, the
      // preview URL on Vercel previews, http://localhost:3000 locally.
      NEXT_PUBLIC_SITE_URL: z.url(),
    },
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    runtimeEnv: {
      ANALYZE: process.env.ANALYZE,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      NEXT_RUNTIME: process.env.NEXT_RUNTIME,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
      VERCEL_REGION: process.env.VERCEL_REGION,
      VERCEL_URL: process.env.VERCEL_URL,
    },
    server: {
      ANALYZE: z.string().optional(),

      // Added by Vercel
      NEXT_RUNTIME: z.enum(["nodejs", "edge"]).optional(),

      // Vercel environment variables
      VERCEL: z.string().optional(),
      VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
      VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
      VERCEL_REGION: z.string().optional(),
      VERCEL_URL: z.string().optional(),
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  });
