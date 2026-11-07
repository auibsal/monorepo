import { createAdminClient } from "@repo/database/admin";
import { log } from "@repo/observability/log";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/api/cron";

/**
 * The daily job. It touches the database so a free-tier Supabase project is
 * not paused, and deletes unpublished submissions twelve months after their
 * decision (owner, Nov 7, 2026): their files in storage first, then the rows.
 */
export const GET = async (request: Request) => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }

  const admin = createAdminClient();
  const { error } = await admin
    .schema("core")
    .from("settings")
    .select("key")
    .limit(1);
  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const { data: due, error: dueError } = await admin
    .schema("journal")
    .rpc("expired_submissions");
  if (dueError) {
    return new Response(dueError.message, { status: 500 });
  }
  const rows = due ?? [];
  if (rows.length > 0) {
    const paths = rows.flatMap((r) => r.paths ?? []);
    if (paths.length > 0) {
      const { error: storageError } = await admin.storage
        .from("submissions")
        .remove(paths);
      if (storageError) {
        return new Response(storageError.message, { status: 500 });
      }
    }
    const { data: deleted, error: deleteError } = await admin
      .schema("journal")
      .rpc("delete_submissions", { ids: rows.map((r) => r.submission_id) });
    if (deleteError) {
      return new Response(deleteError.message, { status: 500 });
    }
    log.info("Deleted unpublished submissions past twelve months", {
      deleted,
    });
  }

  return new Response("OK", { status: 200 });
};
