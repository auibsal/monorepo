import { createAdminClient } from "@repo/database/admin";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { respond } from "@/lib/api/problem";
import { withinRateLimit } from "@/lib/api/rate-limit";
import { isHuman } from "@/lib/api/turnstile";
import { authenticateRequest } from "@/lib/auth/verify";
import { parseError } from "@/lib/observability/error";
import { log } from "@/lib/observability/log";

export const OPTIONS = preflight;

const reportSchema = z.object({
  lang: z.enum(["en", "ar"]).default("en"),
  message: z.string().trim().min(5).max(2000),
  /** The page the problem is on: a path on the site. */
  page: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .regex(/^\/[^\s]*$/u),
  replyTo: z.string().trim().email().max(320).nullish(),
  token: z.string().max(4096).nullish(),
  /** Left empty by people; filled by bots (the form hides it). */
  website: z.string().max(500).optional(),
});

/**
 * "Report a problem" (decisions.md, The site): from any page, to the web
 * lead in the Diwan. A signed-in person's account is attached, so they
 * aren't asked who they are; anyone else may leave an address for a reply.
 */
export const POST = async (request: Request) => {
  const json = respond(corsHeaders(request));
  const parsed = reportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: "invalid_request" }, 400);
  }
  const { lang, message, page, replyTo, token, website } = parsed.data;
  if (website) {
    return json({ ok: true });
  }
  const session = await authenticateRequest(request);
  if (
    !(await withinRateLimit(request, "problem-report", {
      key: session?.userId,
      max: 5,
    }))
  ) {
    return json({ error: "rate_limited" }, 429);
  }
  if (!(session || (await isHuman(request, token)))) {
    return json({ error: "human_check_failed" }, 403);
  }
  const { error } = await createAdminClient()
    .schema("core")
    .from("problem_reports")
    .insert({
      lang,
      message,
      page,
      reply_to: session ? null : (replyTo ?? null),
      user_id: session?.userId ?? null,
    });
  if (error) {
    log.error(`Problem report failed: ${parseError(error)}`);
    return json({ error: "failed" }, 500);
  }
  return json({ ok: true });
};
