import { project } from "@repo/config";
import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { revalidateTag } from "next/cache";
import { env } from "@/env";
import { hasBearer } from "@/lib/api/bearer";
import { parseIcal } from "@/lib/api/ical";
import { termsFromFeed } from "@/lib/api/terms";

export const maxDuration = 60;

/**
 * Hourly (pg_cron, or Vercel Cron with CRON_SECRET): reads the AUIB public
 * calendar (`campusCalendar` in the project file) into core.external_events,
 * and the terms it opens and closes into core.semesters (role terms, voting
 * standing and declarations follow them). Events that left the feed are
 * removed from the window the feed covers. What's on (/events) shows them.
 */
const sync = async (request: Request) => {
  if (!hasBearer(request, env.CRON_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const admin = createAdminClient();
  const url = project.campusCalendar;

  let text: string;
  try {
    const response = await fetch(url, {
      headers: {
        accept: "text/calendar",
        "user-agent": "auibsal.org calendar sync (+https://auibsal.org)",
      },
      // AUIB's server is sometimes slow; the run has a minute in all.
      signal: AbortSignal.timeout(40_000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    text = await response.text();
  } catch (error) {
    // The next hourly run tries again; nothing is lost in between.
    log.warn(`AUIB calendar fetch failed: ${parseError(error)}`);
    return Response.json({ error: "fetch_failed" }, { status: 502 });
  }

  const events = parseIcal(text);
  if (events.length === 0) {
    return Response.json({ synced: 0 });
  }
  const syncedAt = new Date().toISOString();
  const { error: storeError } = await admin
    .schema("core")
    .from("external_events")
    .upsert(
      events.map((e) => ({
        all_day: e.allDay,
        ends_at: e.end,
        location: e.location,
        source: "auib",
        starts_at: e.start,
        synced_at: syncedAt,
        title: e.title,
        uid: e.uid,
        url: e.url,
      })),
      { onConflict: "source,uid" }
    );
  if (storeError) {
    log.error(`AUIB calendar upsert failed: ${storeError.message}`);
    return Response.json({ error: "store_failed" }, { status: 500 });
  }
  const earliest = events.reduce(
    (min, e) => (e.start < min ? e.start : min),
    events[0].start
  );
  await admin
    .schema("core")
    .from("external_events")
    .delete()
    .eq("source", "auib")
    .lt("synced_at", syncedAt)
    .gte("starts_at", earliest);
  // A term the calendar names is kept by its code; one that would overlap a
  // term already kept is logged and left for the next run.
  const stored = await Promise.all(
    termsFromFeed(events).map(async (term) => {
      const { error } = await admin
        .schema("core")
        .from("semesters")
        .upsert(term, { onConflict: "code" });
      if (error) {
        log.warn(`Term ${term.code} not stored: ${error.message}`);
      }
      return !error;
    })
  );
  const terms = stored.filter(Boolean).length;
  // What's on shows these dates; refresh its cached reads.
  revalidateTag("events", "max");
  return Response.json({ synced: events.length, terms });
};

export const GET = sync;
export const POST = sync;
