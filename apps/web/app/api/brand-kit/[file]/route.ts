import manifest from "@repo/brand/assets/video/manifest.json";
import { createAdminClient } from "@repo/database/admin";
import { hasPermissionAnywhere } from "@/lib/api/permissions";
import { authenticateCookies, authenticateRequest } from "@/lib/auth/verify";

/**
 * The kit's video files (decisions.md, Brand and design: Video): kept out
 * of git in the private brand-kit bucket. Staff download them from the
 * design system's page (a signed address, five minutes); Media uploads the
 * approved files named in packages/brand/assets/video/manifest.json.
 */
const BUCKET = "brand-kit";
const IN_BUCKET = new Set(
  manifest.files.filter((f) => f.where === "bucket").map((f) => f.file)
);

const notFound = () =>
  new Response("Not found", {
    headers: { "Cache-Control": "no-store" },
    status: 404,
  });

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ file: string }> }
) => {
  const { file } = await params;
  if (!IN_BUCKET.has(file)) {
    return notFound();
  }
  const session = await authenticateCookies(request);
  const { data: me } = session
    ? await session.supabase.schema("membership").rpc("my_membership")
    : { data: null };
  const row = Array.isArray(me) ? me[0] : me;
  if (row?.staff !== true) {
    return notFound();
  }
  const { data } = await createAdminClient()
    .storage.from(BUCKET)
    .createSignedUrl(file, 300, { download: file });
  if (!data?.signedUrl) {
    return notFound();
  }
  return Response.redirect(data.signedUrl, 303);
};

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ file: string }> }
) => {
  const { file } = await params;
  const session = await authenticateRequest(request);
  if (!(session && (await hasPermissionAnywhere(session, "content.manage")))) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  if (!IN_BUCKET.has(file)) {
    return Response.json({ error: "not_in_manifest" }, { status: 400 });
  }
  const form = await request.formData();
  const body = form.get("file");
  if (!(body instanceof File) || body.type !== "video/mp4") {
    return Response.json({ error: "mp4_required" }, { status: 400 });
  }
  const { error } = await createAdminClient()
    .storage.from(BUCKET)
    .upload(file, body, { contentType: "video/mp4", upsert: true });
  return error
    ? Response.json({ error: "upload_failed" }, { status: 500 })
    : Response.json({ ok: true });
};
