import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const DOMAIN = /^[a-z0-9.-]+$/u;

export const keys = () =>
  createEnv({
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    runtimeEnv: {
      RESEND_BULK_DOMAIN: process.env.RESEND_BULK_DOMAIN,
      RESEND_TOKEN: process.env.RESEND_TOKEN,
    },
    server: {
      /** The bulk mail subdomain once Resend has verified it (news.auibsal.org). */
      RESEND_BULK_DOMAIN: z.string().regex(DOMAIN).optional(),
      RESEND_TOKEN: z.string().startsWith("re_").optional(),
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  });
