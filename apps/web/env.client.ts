import { keys as analytics } from "@repo/analytics/keys";
import { keys as auth } from "@repo/auth/keys";
import { envPresets, withPresets } from "@repo/next-config/env";
import { keys as core } from "@repo/next-config/keys";
import { keys as observability } from "@repo/observability/keys";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const presets = envPresets(analytics(), auth(), core(), observability());

/**
 * The public half of the environment, for client components and the Nexus:
 * NEXT_PUBLIC_* values only. Importing `@/env` from client code would carry
 * the server keys' names into the browser bundle (CI greps for them).
 */
export const clientEnv = withPresets(
  createEnv({
    client: {
      // Web Push: the public half of the VAPID pair.
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(80).optional(),
    },
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    extends: presets,
    runtimeEnv: {
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    },
    server: {},
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  }),
  presets
);
