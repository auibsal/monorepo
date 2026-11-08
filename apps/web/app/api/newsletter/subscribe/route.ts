import { randomBytes } from "node:crypto";
import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { withinRateLimit } from "@/lib/api/rate-limit";
import { isHuman } from "@/lib/api/turnstile";

export const OPTIONS = preflight;

const requestSchema = z.object({
  email: z.email().max(320),
  lang: z.enum(["en", "ar"]).default("en"),
  /** Left empty by people; filled by bots (the form hides it). */
  /** Cloudflare Turnstile's token (none locally). */
  token: z.string().max(4096).nullish(),
  website: z.string().max(500).optional(),
});

/** A confirmation email goes out at most this often per address. */
/** Confirmations to one address within WINDOW_MS. */
const MAX_CONFIRMS = 3;
const WINDOW_MS = 30 * 86_400_000;
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
  const { lang, token: humanToken, website } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();
  if (website) {
    return json({ ok: true });
  }

  if (!(await withinRateLimit(request, "newsletter", { max: 20 }))) {
    return json({ error: "rate_limited" }, 429);
  }
  if (!(await isHuman(request, humanToken))) {
    return json({ error: "human_check_failed" }, 403);
  }

  const admin = createAdminClient();
  const table = admin.schema("content").from("newsletter_subscribers");
  const { data: existing } = await table
    .select("id, status, confirm_sent_at, confirm_sends, confirm_window_at")
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

  // At most three confirmations to one address in thirty days (audit D3).
  const windowOpen =
    existing?.confirm_window_at &&
    Date.now() - new Date(existing.confirm_window_at).getTime() < WINDOW_MS;
  const sends = windowOpen ? (existing?.confirm_sends ?? 0) : 0;
  if (sends >= MAX_CONFIRMS) {
    return json({ ok: true });
  }

  // A new token queues the confirmation email (database trigger).
  const token = randomBytes(24).toString("hex");
  const now = new Date().toISOString();
  const row = {
    confirm_sends: sends + 1,
    confirm_sent_at: now,
    confirm_token: token,
    confirm_window_at: windowOpen ? existing?.confirm_window_at : now,
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
