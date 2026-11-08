import { authenticateRequest } from "@repo/auth/verify";
import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { buckets, checkFile } from "@repo/storage";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { respond } from "@/lib/api/problem";

export const OPTIONS = preflight;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** What the station is told when the database says no. */
const REFUSALS: Record<string, string> = {
  card_not_live: "card_not_live",
  no_pending_request: "no_pending_request",
  station_closed: "station_closed",
};

const text = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

/**
 * The Tour's station (decisions §12): a confirmed volunteer on a station
 * shift, while it runs, sends the photographed page with a live card's
 * code and digits, or with the address of a pending Associate request.
 * The photo goes to the private tour-pages bucket; the database
 * (`programmes.station_attach`, under the volunteer's own claims) decides
 * and keeps the page, private, and logs it. A refused page's photo is
 * removed at once.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = respond(headers);

  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }
  const { data: shift } = await session.supabase
    .schema("programmes")
    .rpc("my_station_shift");
  if (!shift) {
    return json({ error: "station_closed" }, 403);
  }

  const form = await request.formData().catch(() => null);
  const photo = form?.get("photo");
  if (!(form && photo instanceof File)) {
    return json({ error: "photo_required" }, 400);
  }
  const problem = checkFile("tourPages", photo);
  if (problem) {
    return json({ error: problem }, 400);
  }
  const cardCode = text(form, "card_code");
  const requestEmail = text(form, "request_email");
  if (!(cardCode || requestEmail)) {
    return json({ error: "invalid_request" }, 400);
  }

  const admin = createAdminClient();
  const path = `station/${crypto.randomUUID()}.${EXTENSIONS[photo.type] ?? "jpg"}`;
  const bucket = admin.storage.from(buckets.tourPages.id);
  const { error: uploadError } = await bucket.upload(path, photo, {
    contentType: photo.type,
    upsert: false,
  });
  if (uploadError) {
    log.error(`Station upload failed: ${parseError(uploadError)}`);
    return json({ error: "upload_failed" }, 500);
  }

  const { data: reference, error } = await session.supabase
    .schema("programmes")
    .rpc("station_attach", {
      card_code: cardCode ?? "",
      digits: text(form, "digits") ?? "",
      photo: path,
      request_email: requestEmail ?? "",
    });
  if (error) {
    await bucket.remove([path]);
    const refusal = REFUSALS[error.message];
    if (refusal) {
      return json({ error: refusal }, 409);
    }
    log.error(`Station page failed: ${parseError(error)}`);
    return json({ error: "failed" }, 500);
  }
  return json({ reference });
};
