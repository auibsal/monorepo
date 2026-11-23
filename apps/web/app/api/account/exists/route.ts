import { createAdminClient } from "@repo/database/admin";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { respond } from "@/lib/api/problem";
import { withinRateLimit } from "@/lib/api/rate-limit";

export const OPTIONS = preflight;

const requestSchema = z.object({ email: z.email().max(320) });

/**
 * The one way in (decisions.md, Members): the page asks the address first,
 * then the password when it has an account, or what a new account needs
 * when it hasn't. The answer is only whether the address has an account.
 * Thirty a visitor in ten minutes (AUIB's students share the campus
 * address); past that, or on any failure, the page asks for the password
 * and offers to make an account instead.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = respond(headers);
  if (
    !(await withinRateLimit(request, "account-exists", {
      failClosed: true,
      max: 30,
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
    .schema("api")
    .rpc("user_by_email", { email: parsed.data.email.trim().toLowerCase() });
  if (error) {
    return json({ error: "failed" }, 500);
  }
  return json({ exists: Boolean(data) });
};
