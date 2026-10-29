import { randomBytes } from "node:crypto";
import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { protectForm } from "@repo/security/form";
import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/api/cors";

export const OPTIONS = preflight;

const requestSchema = z.object({
  email: z.email().max(320),
  lang: z.enum(["en", "ar"]).default("en"),
  /** Left empty by people; filled by bots (the form hides it). */
  website: z.string().max(500).optional(),
});

/** A confirmation email goes out at most this often per address. */
const RESEND_AFTER_MS = 10 * 60 * 1000;

/**
 * The public newsletter, step one: anyone may ask for the Sunday Paper.
 * The address gets a confirmation email (double opt-in); nothing else is
 * sent until it is confirmed. The answer is the same whether or not the
 * address was already on the list, so the form never reveals who is.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = (payload: object, status = 200) =>
    NextResponse.json(payload, { headers, status });

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return json({ error: "invalid_email" }, 400);
  }
  const { lang, website } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();
  if (website) {
    return json({ ok: true });
  }

  const verdict = await protectForm(request, email);
  if (verdict === "rate_limited") {
    return json({ error: "rate_limited" }, 429);
  }
  if (verdict === "invalid_email") {
    return json({ error: "invalid_email" }, 400);
  }
  if (verdict === "bot") {
    return json({ error: "forbidden" }, 403);
  }

  const admin = createAdminClient();
  const table = admin.schema("content").from("newsletter_subscribers");
  const { data: existing } = await table
    .select("id, status, confirm_sent_at")
    .eq("email", email)
    .maybeSingle();

  if (existing?.status === "subscribed") {
    return json({ ok: true });
  }
  if (
    existing?.confirm_sent_at &&
    Date.now() - new Date(existing.confirm_sent_at).getTime() < RESEND_AFTER_MS
  ) {
    return json({ ok: true });
  }

  // A new token queues the confirmation email (database trigger).
  const token = randomBytes(24).toString("hex");
  const row = {
    confirm_sent_at: new Date().toISOString(),
    confirm_token: token,
    lang,
    status: "pending",
  };
  const { error } = existing
    ? await table.update(row).eq("id", existing.id)
    : await table.insert({ ...row, email });
  if (error) {
    log.error(`Newsletter sign-up failed: ${parseError(error)}`);
    return json({ error: "failed" }, 500);
  }
  return json({ ok: true });
};
