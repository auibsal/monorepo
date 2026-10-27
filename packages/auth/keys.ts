import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    client: {
      // Optional parent domain for the session cookie (".auibsal.org"),
      // only if the sign-in must also carry to a subdomain. Unset otherwise.
      NEXT_PUBLIC_AUTH_COOKIE_DOMAIN: z.string().startsWith(".").optional(),
      // The IDEA Pass (owner, 2026-10-26): the only way to sign in once
      // both are set; until then the email sign-in stays. The issuer is the
      // Pass's OpenID Connect address, the client id SAL's registration
      // there. Its secret is PASS_CLIENT_SECRET (server only).
      NEXT_PUBLIC_PASS_CLIENT_ID: z.string().min(1).optional(),
      NEXT_PUBLIC_PASS_ISSUER: z.url().optional(),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
        .string()
        .startsWith("sb_publishable_")
        .optional(),
      NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
      // Cloudflare Turnstile site key (public) for Supabase Auth's human
      // check on sign-up, sign-in and reset. Its secret half is set in the
      // Supabase dashboard (Authentication → Attack Protection), not here.
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
    },
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    runtimeEnv: {
      NEXT_PUBLIC_AUTH_COOKIE_DOMAIN:
        process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN,
      NEXT_PUBLIC_PASS_CLIENT_ID: process.env.NEXT_PUBLIC_PASS_CLIENT_ID,
      NEXT_PUBLIC_PASS_ISSUER: process.env.NEXT_PUBLIC_PASS_ISSUER,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_TURNSTILE_SITE_KEY:
        process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  });
