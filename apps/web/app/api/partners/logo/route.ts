import { createAdminClient } from "@repo/database/admin";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { hasPermission } from "@/lib/api/permissions";
import { respond } from "@/lib/api/problem";
import { authenticateRequest } from "@/lib/auth/verify";
import { parseError } from "@/lib/observability/error";
import { log } from "@/lib/observability/log";
import { buckets, checkFile } from "@/lib/storage";
import { logoTallEnough } from "@/lib/storage/image-size";

export const OPTIONS = preflight;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

/**
 * A partner's logo from its dashboard (decisions.md, Partners): the
 * partner's team sends the file, which waits under partners/pending/ for
 * Partnerships to approve (`governance.decide_partner_logo`) before it
 * shows. The team cannot write to the media bucket itself, so the upload
 * is made here once the caller is checked; the database
 * (`governance.propose_partner_logo`, under the caller's own claims)
 * checks again and keeps the proposal. A refused file is removed at once.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = respond(headers);

  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }
  const form = await request.formData().catch(() => null);
  const partner = form?.get("partner");
  const logo = form?.get("logo");
  if (!(typeof partner === "string" && UUID.test(partner))) {
    return json({ error: "invalid_request" }, 400);
  }
  if (!(logo instanceof File)) {
    return json({ error: "logo_required" }, 400);
  }
  const problem = checkFile("media", logo);
  if (problem || !EXTENSIONS[logo.type]) {
    return json({ error: problem ?? "file_type" }, 400);
  }
  // At least 600 pixels high, read from the file itself (decisions.md,
  // Partners); SVG never reaches here (XSS), as the media bucket refuses it.
  if (!(await logoTallEnough(logo))) {
    return json({ error: "logo_too_small" }, 400);
  }
  if (!(await hasPermission(session, "partners.own", "partner", partner))) {
    return json({ error: "forbidden" }, 403);
  }

  const admin = createAdminClient();
  const path = `partners/pending/${partner}/${crypto.randomUUID()}.${EXTENSIONS[logo.type]}`;
  const bucket = admin.storage.from(buckets.media.id);
  const { error: uploadError } = await bucket.upload(path, logo, {
    contentType: logo.type,
    upsert: false,
  });
  if (uploadError) {
    log.error(`Partner logo upload failed: ${parseError(uploadError)}`);
    return json({ error: "upload_failed" }, 500);
  }
  const { error } = await session.supabase
    .schema("governance")
    .rpc("propose_partner_logo", { partner, path });
  if (error) {
    await bucket.remove([path]);
    log.error(`Partner logo refused: ${parseError(error)}`);
    return json({ error: "refused" }, 403);
  }
  return json({ path });
};
