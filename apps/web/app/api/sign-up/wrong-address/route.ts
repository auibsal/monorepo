import { createAdminClient } from "@repo/database/admin";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { respond } from "@/lib/api/problem";
import { withinRateLimit } from "@/lib/api/rate-limit";

export const OPTIONS = preflight;

const requestSchema = z.object({
  email: z.string().min(3).max(320),
  key: z.string().min(32).max(128),
});

/**
 * "Wrong address?" on the inbox screen after sign-up (decisions.md,
 * Members): the browser that made the sign-up sends the address and the
 * random key it kept, whose hash went with the sign-up; the unconfirmed
 * account made there in the last day is deleted, and the person signs up
 * again at the right address, so no second account is left behind. Any
 * other address, a confirmed account or a wrong key changes nothing.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = respond(headers);
  if (
    !(await withinRateLimit(request, "sign-up-wrong-address", {
      failClosed: true,
      max: 5,
    }))
  ) {
    return json({ error: "rate_limited" }, 429);
  }
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return json({ error: "invalid" }, 400);
  }
  const { data, error } = await createAdminClient()
    .schema("core")
    .rpc("drop_unconfirmed_sign_up", {
      email: parsed.data.email,
      sign_up_key: parsed.data.key,
    });
  if (error) {
    return json({ error: "failed" }, 500);
  }
  return json({ dropped: data === true });
};
