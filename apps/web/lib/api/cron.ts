import { env } from "@/env";
import { hasBearer } from "./bearer";
import { problem } from "./problem";

/**
 * pg_cron calls the cron routes with `Authorization: Bearer <CRON_SECRET>`
 * (`private.call_api`, the secret in Vault as `cron_secret`). Fails closed:
 * if the secret is not configured, every request is rejected.
 */
export const isAuthorizedCronRequest = (request: Request): boolean =>
  hasBearer(request, env.CRON_SECRET);

export const unauthorized = () => problem(401, "unauthorized");
