import { createAdminClient } from "@repo/database/admin";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { markedImage } from "@/lib/api/marked-image";
import { respond } from "@/lib/api/problem";
import { authenticateRequest } from "@/lib/auth/verify";
import { parseError } from "@/lib/observability/error";
import { log } from "@/lib/observability/log";

export const OPTIONS = preflight;
export const maxDuration = 60;

const body = z.object({ entry: z.uuid() });

const BUCKET = "submissions";
const IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);
/** A Gallery entry rarely has more; the rest stay with the original. */
const MAX_IMAGES = 12;

/**
 * A blind entry's images for its readers, each a copy drawn again with the
 * reader's card number and the day across it, sent in the answer itself:
 * no file, file address or download reaches a reader, and manuscripts never
 * leave the site (readers read the text on the page). The caller's own
 * journal.entry_text() decides: someone who may read the entry and has
 * taken the readers' pledge.
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
  const entryId = parsed.data.entry;

  const text = await session.supabase
    .schema("journal")
    .rpc("entry_text", { entry: entryId });
  if (text.error) {
    return text.error.hint === "reader_pledge"
      ? json({ error: "pledge_required" }, 403)
      : json({ error: "not_found" }, 404);
  }
  const reading = text.data?.[0];
  if (!reading) {
    return json({ error: "not_found" }, 404);
  }

  const admin = createAdminClient();
  const { data: link } = await admin
    .schema("journal")
    .from("blind_keys")
    .select("submission_id")
    .eq("blind_entry_id", entryId)
    .single();
  if (!link) {
    return json({ images: [] });
  }
  const { data: rows } = await admin
    .schema("journal")
    .from("submission_files")
    .select("id, mime_type, storage_path")
    .eq("submission_id", link.submission_id)
    .eq("kind", "image")
    .order("created_at");

  const day = new Date().toISOString().slice(0, 10);
  const mark = [reading.mark, day].filter(Boolean).join(" · ");
  const images = await Promise.all(
    (rows ?? [])
      .filter((file) => IMAGE_TYPES.has(file.mime_type))
      .slice(0, MAX_IMAGES)
      .map(async (file, index) => {
        const key = `image-${index + 1}`;
        try {
          const { data, error } = await admin.storage
            .from(BUCKET)
            .download(file.storage_path);
          if (error || !data) {
            throw new Error(error?.message ?? "no data");
          }
          const { height, jpeg, width } = await markedImage(
            new Uint8Array(await data.arrayBuffer()),
            mark
          );
          const src = `data:image/jpeg;base64,${Buffer.from(jpeg).toString("base64")}`;
          return { height, key, src, width };
        } catch (error) {
          log.error(`Marked copy failed for ${file.id}: ${parseError(error)}`);
          return { height: 0, key, src: null, width: 0 };
        }
      })
  );
  return json({ images }, 200);
};
