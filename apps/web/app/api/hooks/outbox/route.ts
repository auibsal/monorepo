import { createAdminClient } from "@repo/database/admin";
import { EmailQuotaError } from "@repo/email";
import { z } from "zod";
import { env } from "@/env";
import { hasBearer } from "@/lib/api/bearer";
import { drain, processRow } from "@/lib/api/outbox";
import { problem } from "@/lib/api/problem";

const body = z.union([
  z.object({ id: z.number().int().positive() }),
  z.object({ drain: z.literal(true) }),
]);

export const maxDuration = 60;

/**
 * Called by the database: `{ id }` from the trigger on each core.outbox
 * insert, `{ drain: true }` every ten minutes from pg_cron. Bearer token:
 * DATABASE_WEBHOOK_SECRET (Vault: outbox_webhook_secret).
 */
export const POST = async (request: Request) => {
  if (!hasBearer(request, env.DATABASE_WEBHOOK_SECRET)) {
    return problem(401, "unauthorized");
  }
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, "invalid_request");
  }
  const admin = createAdminClient();
  if ("drain" in parsed.data) {
    return Response.json(await drain(admin));
  }
  try {
    const done = await processRow(admin, parsed.data.id);
    return Response.json({ done }, { status: done ? 200 : 500 });
  } catch (error) {
    if (error instanceof EmailQuotaError) {
      // Held for the next drain once the daily sending limit resets.
      return Response.json({ done: false, quotaReached: true });
    }
    throw error;
  }
};
