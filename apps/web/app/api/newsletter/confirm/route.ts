import { createAdminClient } from "@repo/database/admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/api/cors";

export const OPTIONS = preflight;

const requestSchema = z.object({ token: z.string().min(32).max(128) });

/** Confirmation links stop working after this long. */
const VALID_FOR_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The public newsletter, step two: the button on
 * auibsal.org/sunday-paper/confirm sends the emailed token back. Opening the
 * link alone confirms nothing, so a mail scanner cannot sign anyone up.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = (payload: object, status = 200) =>
    NextResponse.json(payload, { headers, status });

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return json({ error: "invalid_token" }, 400);
  }
  const admin = createAdminClient();
  const table = admin.schema("content").from("newsletter_subscribers");
  const { data: row } = await table
    .select("id, confirm_sent_at")
    .eq("confirm_token", parsed.data.token)
    .eq("status", "pending")
    .maybeSingle();
  const sent = row?.confirm_sent_at
    ? new Date(row.confirm_sent_at).getTime()
    : 0;
  if (!row || Date.now() - sent > VALID_FOR_MS) {
    return json({ error: "invalid_token" }, 400);
  }
  const { error } = await table
    .update({
      confirm_token: null,
      confirmed_at: new Date().toISOString(),
      status: "subscribed",
      unsubscribed_at: null,
    })
    .eq("id", row.id);
  if (error) {
    return json({ error: "failed" }, 500);
  }
  return json({ ok: true });
};
