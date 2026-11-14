import { createEnv } from "@t3-oss/env-nextjs";
import { keys as auth } from "@/lib/auth/keys";
import { envPresets, withPresets } from "@/lib/next-config/env";
import { keys as core } from "@/lib/next-config/keys";

const presets = envPresets(auth(), core());

/**
 * The public half of the environment, for client components, Membership and the Diwan:
 * NEXT_PUBLIC_* values only. Importing `@/env` from client code would carry
 * the server keys' names into the browser bundle (CI greps for them).
 */
export const clientEnv = withPresets(
  createEnv({
    client: {},
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    extends: presets,
    runtimeEnv: {},
    server: {},
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  }),
  presets
);
