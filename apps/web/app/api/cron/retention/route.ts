import { createAdminClient } from "@repo/database/admin";
import { log } from "@repo/observability/log";
import { buckets } from "@repo/storage";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/api/cron";
import { deleteAccount } from "@/lib/api/deletion";
import { problem } from "@/lib/api/problem";

type Admin = ReturnType<typeof createAdminClient>;

/** Unpublished submissions twelve months after the decision: files, then rows. */
const deleteSubmissions = async (admin: Admin) => {
  const { data: due, error } = await admin
    .schema("journal")
    .rpc("expired_submissions");
  if (error) {
    throw error;
  }
  const rows = due ?? [];
  if (rows.length === 0) {
    return 0;
  }
  const paths = rows.flatMap((r) => r.paths ?? []);
  if (paths.length > 0) {
    const { error: storageError } = await admin.storage
      .from(buckets.submissions.id)
      .remove(paths);
    if (storageError) {
      throw storageError;
    }
  }
  const { data: deleted, error: deleteError } = await admin
    .schema("journal")
    .rpc("delete_submissions", { ids: rows.map((r) => r.submission_id) });
  if (deleteError) {
    throw deleteError;
  }
  return deleted ?? 0;
};

/**
 * The daily retention job (decisions §13, "Retention"; the schedule is
 * `core.retention_schedule()`). The rules that remove files or accounts
 * start here: unpublished submissions, the photographs of unclaimed Tour
 * pages and guest accounts unused for two years. Then the database runs
 * every other rule (`core.run_retention`), emailing the administrators
 * about any that fail. The read also keeps a free-tier project awake.
 */
export const GET = async (request: Request) => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }
  const admin = createAdminClient();
  try {
    const submissions = await deleteSubmissions(admin);

    const { data: due, error: dueError } = await admin
      .schema("core")
      .rpc("retention_due");
    if (dueError) {
      throw dueError;
    }
    const photos = (due ?? [])
      .filter((d) => d.kind === "tour_photo")
      .map((d) => d.ref);
    if (photos.length > 0) {
      const { error: photoError } = await admin.storage
        .from(buckets.tourPages.id)
        .remove(photos);
      if (photoError) {
        throw photoError;
      }
    }

    const { data: run, error: runError } = await admin
      .schema("core")
      .rpc("run_retention");
    if (runError) {
      throw runError;
    }

    const guests = (due ?? [])
      .filter((d) => d.kind === "guest_account")
      .map((d) => d.ref);
    for (const id of guests) {
      // biome-ignore lint/performance/noAwaitInLoops: one account at a time
      await deleteAccount(admin, id);
    }

    log.info("Retention", {
      guests: guests.length,
      photos: photos.length,
      run: JSON.stringify(run),
      submissions,
    });
    return new Response("OK", { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error("Retention failed", { message });
    // The administrators hear of it the way they hear of a failed pg_cron job.
    await admin
      .schema("core")
      .from("outbox")
      .insert({
        kind: "platform.cron_failed",
        payload: {
          day: new Date().toISOString().slice(0, 10),
          jobs: [
            {
              failures: 1,
              job: "retention (/api/cron/retention)",
              last_at: new Date().toISOString(),
              last_error: message.slice(0, 300),
            },
          ],
        },
      });
    return problem(500, "retention_failed");
  }
};
