import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { programmes } from "@repo/sal-data";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { respond } from "@/lib/api/problem";
import { withinRateLimit } from "@/lib/api/rate-limit";
import { isHuman } from "@/lib/api/turnstile";

export const OPTIONS = preflight;

const requestSchema = programmes.removalRequestSchema.extend({
  programme: z.enum(["next-stop"]).optional(),
  requester_lang: z.enum(["en", "ar"]).optional(),
  /** Left empty by people; filled by bots (the form hides it). */
  /** Cloudflare Turnstile's token (none locally). */
  token: z.string().max(4096).nullish(),
  website: z.string().max(500).optional(),
});

/** At most this many requests per email address per hour. */
const PER_HOUR = 3;

/**
 * Removal requests (MEM-02, decisions §13), from Contact: anyone may ask
 * for a photo or video of themselves to be removed. What the request points
 * to on the site is hidden at once (private.hide_for_removal), and staff
 * decide within two business days. No sign-in is
 * needed, so the request is written with the admin client after validation;
 * the database trigger queues the notice to the program's managers.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = respond(headers);

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return json({ error: "invalid_request" }, 400);
  }
  const { programme, requester_lang, token, website, ...fields } = parsed.data;
  if (website) {
    // Pretend success so the bot learns nothing.
    return json({ ok: true });
  }

  if (!(await withinRateLimit(request, "removal-request", { max: 10 }))) {
    return json({ error: "rate_limited" }, 429);
  }
  if (!(await isHuman(request, token))) {
    return json({ error: "human_check_failed" }, 403);
  }

  const admin = createAdminClient();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .schema("programmes")
    .from("removal_requests")
    .select("id", { count: "exact", head: true })
    .eq("requester_email", fields.requester_email)
    .gte("created_at", since);
  if ((count ?? 0) >= PER_HOUR) {
    return json({ error: "rate_limited" }, 429);
  }

  const { data: programmeRow } = await admin
    .schema("core")
    .from("programmes")
    .select("id")
    .eq("slug", programme ?? "next-stop")
    .maybeSingle();

  const { data, error } = await admin
    .schema("programmes")
    .from("removal_requests")
    .insert({
      content_url: fields.content_url || null,
      details: fields.details,
      programme_id: programmeRow?.id ?? null,
      requester_email: fields.requester_email,
      requester_lang: requester_lang ?? "en",
      requester_name: fields.requester_name,
    })
    .select("due_at")
    .single();
  if (error || !data) {
    log.error(`Removal request failed: ${parseError(error)}`);
    return json({ error: "failed" }, 500);
  }
  return json({ dueAt: data.due_at, ok: true });
};
