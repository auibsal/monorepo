import { createAdminClient } from "@repo/database/admin";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { respond } from "@/lib/api/problem";

export const OPTIONS = preflight;

const requestSchema = z.object({ token: z.string().min(32).max(128) });

/**
 * A personal email, step two: the button on
 * auibsal.org/personal-email/confirm sends the emailed token back (opening
 * the link alone confirms nothing). core.confirm_personal_email checks the
 * token's age and, again, that the address is nobody else's.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = respond(headers);

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return json({ error: "invalid_token" }, 400);
  }
  const { error } = await createAdminClient()
    .schema("core")
    .rpc("confirm_personal_email", { token: parsed.data.token });
  if (error?.message.includes("invalid_token")) {
    return json({ error: "invalid_token" }, 400);
  }
  if (error?.message.includes("email_in_use")) {
    return json({ error: "email_in_use" }, 409);
  }
  if (error) {
    return json({ error: "failed" }, 500);
  }
  return json({ ok: true });
};
