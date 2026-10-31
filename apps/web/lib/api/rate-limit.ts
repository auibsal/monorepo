import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "@repo/database/admin";
import { log } from "@repo/observability/log";

/**
 * The visitor's address: Cloudflare's CF-Connecting-IP in front of
 * auibsal.org, else the first X-Forwarded-For hop (Vercel). Only hashed,
 * never stored as is.
 */
const visitorOf = (request: Request) =>
  request.headers.get("cf-connecting-ip") ??
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
  "unknown";

/**
 * Whether a public form may take one more request from this visitor: at
 * most `max` per `windowSeconds` (ten minutes). Limits are set with AUIB's
 * campus network in mind, where many students share one address. The
 * count is kept in the database (core.take_rate). It fails open: if the
 * count can't be read, the form's own checks still run.
 */
export const withinRateLimit = async (
  request: Request,
  form: string,
  {
    max = 5,
    windowSeconds = 600,
  }: { max?: number; windowSeconds?: number } = {}
): Promise<boolean> => {
  const bucket = createHash("sha256")
    .update(`${form}|${visitorOf(request)}`)
    .digest("hex");
  const { data, error } = await createAdminClient()
    .schema("core")
    .rpc("take_rate", {
      bucket,
      max_hits: max,
      window_seconds: windowSeconds,
    });
  if (error) {
    log.warn(`Rate limit not checked (${form}): ${error.message}`);
    return true;
  }
  return data !== false;
};
