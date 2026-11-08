import { createAdminClient } from "@repo/database/admin";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { respond } from "@/lib/api/problem";
import { withinRateLimit } from "@/lib/api/rate-limit";
import { isHuman } from "@/lib/api/turnstile";
import { parseError } from "@/lib/observability/error";
import { log } from "@/lib/observability/log";

export const OPTIONS = preflight;

const requestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  full_name: z.string().trim().min(2).max(120),
  note: z.string().trim().max(1000).optional(),
  relation: z.enum(["faculty", "staff", "alumni"]),
  /** Left empty by people; filled by bots (the form hides it). */
  /** Cloudflare Turnstile's token (none locally). */
  token: z.string().max(4096).nullish(),
  website: z.string().max(500).optional(),
});

/**
 * Request Associate membership (decisions §2, §12), from /join: faculty,
 * staff and alumni ask; the Director of Membership approves with a named
 * invitation or declines with a reason. No sign-in is needed, so the
 * request is written with the admin client after validation and a rate
 * limit. One pending request per address.
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
  const { token, website, ...fields } = parsed.data;
  if (website) {
    return json({ ok: true });
  }
  if (!(await withinRateLimit(request, "associate-request", { max: 10 }))) {
    return json({ error: "rate_limited" }, 429);
  }
  if (!(await isHuman(request, token))) {
    return json({ error: "human_check_failed" }, 403);
  }

  const admin = createAdminClient();
  const { error } = await admin
    .schema("membership")
    .from("associate_requests")
    .insert({
      email: fields.email,
      full_name: fields.full_name,
      note: fields.note || null,
      relation: fields.relation,
    });
  // Already waiting: the same answer, so nothing is learned about others.
  if (error && error.code !== "23505") {
    log.error(`Associate request failed: ${parseError(error)}`);
    return json({ error: "failed" }, 500);
  }
  return json({ ok: true });
};
