import { createAdminClient } from "@repo/database/admin";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { respond } from "@/lib/api/problem";
import { authenticateRequest } from "@/lib/auth/verify";
import { parseError } from "@/lib/observability/error";
import { log } from "@/lib/observability/log";
import { createSignedFileUrl } from "@/lib/storage";

export const OPTIONS = preflight;

const body = z.object({ id: z.uuid() });

/**
 * A five-minute link to the signed copy of a partnership memorandum (Form
 * F-26). The caller reads the row with their own JWT, so RLS decides
 * (partnership managers, signers and governance managers only).
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

  const { data: agreement } = await session.supabase
    .schema("governance")
    .from("partner_agreements")
    .select("signed_document_path")
    .eq("id", parsed.data.id)
    .maybeSingle();
  const path = agreement?.signed_document_path;
  if (!path?.startsWith("partners/")) {
    return json({ error: "not_found" }, 404);
  }

  try {
    const url = await createSignedFileUrl(createAdminClient(), "library", path);
    return json({ url });
  } catch (error) {
    log.error(`Agreement link failed: ${parseError(error)}`);
    return json({ error: "not_found" }, 404);
  }
};
