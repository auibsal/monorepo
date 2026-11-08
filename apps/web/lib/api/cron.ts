import { env } from "@/env";
import { hasBearer } from "./bearer";
import { problem } from "./problem";

/**
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when the
 * `CRON_SECRET` environment variable is set on the project. Fails closed: if
 * the secret is not configured, every request is rejected.
 */
export const isAuthorizedCronRequest = (request: Request): boolean =>
  hasBearer(request, env.CRON_SECRET);

export const unauthorized = () => problem(401, "unauthorized");
