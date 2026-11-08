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
 * A five-minute link to a Tour page as the station photographed it, for
 * its writer and whoever runs the Tour: the caller's own read of
 * programmes.six_words decides, under RLS.
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
  const { data: page } = await session.supabase
    .schema("programmes")
    .from("six_words")
    .select("photo_path")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!page?.photo_path) {
    return json({ error: "not_found" }, 404);
  }
  try {
    const url = await createSignedFileUrl(
      createAdminClient(),
      "tour-pages",
      page.photo_path
    );
    return json({ url });
  } catch (error) {
    log.error(`Tour photo link failed: ${parseError(error)}`);
    return json({ error: "not_found" }, 404);
  }
};
