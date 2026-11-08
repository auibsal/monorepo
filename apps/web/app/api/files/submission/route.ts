import { authenticateRequest } from "@repo/auth/verify";
import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { createSignedFileUrl } from "@repo/storage";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { respond } from "@/lib/api/problem";

export const OPTIONS = preflight;

const body = z.object({ id: z.uuid() });

/**
 * A five-minute link to an original submission file, for its author, the
 * Submissions Manager while the work is in intake, and the section's
 * editor or the Editor-in-Chief once it is accepted (or a section's editor
 * for named work at the desk). journal.open_original() decides, under the
 * caller's own claims, and keeps each opening for the submission's
 * History. Readers never get an original: they read the work on the page.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = respond(headers);

  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: "invalid_request" }, 400);
  }

  const { data: path, error } = await session.supabase
    .schema("journal")
    .rpc("open_original", { file: parsed.data.id });
  if (error || !path) {
    return error?.code === "42501"
      ? json({ error: "forbidden" }, 403)
      : json({ error: "not_found" }, 404);
  }

  try {
    const url = await createSignedFileUrl(
      createAdminClient(),
      "submissions",
      path
    );
    return json({ url });
  } catch (failure) {
    log.error(`Submission link failed: ${parseError(failure)}`);
    return json({ error: "not_found" }, 404);
  }
};
