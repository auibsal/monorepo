import { createAdminClient } from "@repo/database/admin";
import sharp from "sharp";
import { z } from "zod";
import {
  blindExtensions,
  isBlindMimeType,
  stripMetadata,
} from "@/lib/api/blind-copy";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { respond } from "@/lib/api/problem";
import { authenticateRequest } from "@/lib/auth/verify";
import { parseError } from "@/lib/observability/error";
import { log } from "@/lib/observability/log";
import { uploadMedia } from "@/lib/storage";

export const OPTIONS = preflight;
export const maxDuration = 60;

const body = z.object({ piece: z.uuid() });

/**
 * A Gallery piece takes the images its writer sent: each submitted image,
 * stripped of its metadata (camera, place, author), goes to the piece's
 * public media in the order it was sent. The editor's own reads and writes
 * decide, under RLS: the piece must be theirs to see, the media theirs to
 * add. Only the private original is read with the secret key. A piece
 * that already has images keeps them.
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
  const journal = session.supabase.schema("journal");
  const { data: piece } = await journal
    .from("pieces")
    .select("id, submission_id")
    .eq("id", parsed.data.piece)
    .maybeSingle();
  if (!piece?.submission_id) {
    return json({ error: "not_found" }, 404);
  }
  const { count } = await journal
    .from("piece_media")
    .select("id", { count: "exact", head: true })
    .eq("piece_id", piece.id);
  if (count) {
    return json({ error: "has_images" }, 409);
  }

  const admin = createAdminClient();
  const { data: files } = await admin
    .schema("journal")
    .from("submission_files")
    .select("mime_type, storage_path")
    .eq("submission_id", piece.submission_id)
    .eq("kind", "image")
    .order("created_at");
  const images = (files ?? []).filter((f) => isBlindMimeType(f.mime_type));
  if (images.length === 0) {
    return json({ error: "no_images" }, 404);
  }

  try {
    let sort = 0;
    for (const image of images) {
      // biome-ignore lint/performance/noAwaitInLoops: in the order they were sent
      const original = await admin.storage
        .from("submissions")
        .download(image.storage_path);
      if (original.error || !original.data) {
        throw new Error(original.error?.message ?? "no data");
      }
      const type = image.mime_type as keyof typeof blindExtensions;
      const bytes = await stripMetadata(
        new Uint8Array(await original.data.arrayBuffer()),
        type
      );
      const { height, width } = await sharp(bytes).metadata();
      const stored = await uploadMedia(
        session.supabase,
        `qirtas/${piece.id}`,
        new File([new Uint8Array(bytes)], `image.${blindExtensions[type]}`, {
          type,
        })
      );
      const inserted = await journal.from("piece_media").insert({
        height: height ?? null,
        piece_id: piece.id,
        sort,
        storage_path: stored.path,
        width: width ?? null,
      });
      if (inserted.error) {
        throw new Error(inserted.error.message);
      }
      sort += 1;
    }
    return json({ added: images.length });
  } catch (error) {
    log.error(`Gallery images failed: ${parseError(error)}`);
    return json({ error: "copy_failed" }, 500);
  }
};
