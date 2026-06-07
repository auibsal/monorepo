import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    CI: z.coerce.boolean().default(false),
    PRIMARY_PAYMENT_PROVIDER: z.string().optional(),
    WAYL_ENV: z.enum(['live', 'test']).optional(),
    WAYL_API_KEY: z.string().optional(),
    WAYL_WEBHOOK_URL: z.string().url().optional(),
    WAYL_WEBHOOK_SECRET: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    LIVEBLOCKS_WEBHOOK_SECRET: z.string().optional(),
    LIVEBLOCKS_SECRET_KEY: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_SEARCH_URL: z.string().url(),
    NEXT_PUBLIC_SEARCH_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_WEB_URL: z.string().url(),
    NEXT_PUBLIC_NEXUS_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SEARCH_URL: process.env.NEXT_PUBLIC_SEARCH_URL,
    NEXT_PUBLIC_SEARCH_KEY: process.env.NEXT_PUBLIC_SEARCH_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
    NEXT_PUBLIC_NEXUS_URL: process.env.NEXT_PUBLIC_NEXUS_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
});
