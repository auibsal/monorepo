import { createHash } from "node:crypto";
import { createAdminClient } from "@repo/database/admin";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { respond } from "@/lib/api/problem";

export const OPTIONS = preflight;

/** The secure link works for three weeks after it was sent. */
const VALID_FOR_MS = 21 * 24 * 60 * 60 * 1000;

const body = z.object({
  answer: z.object({ event_id: z.uuid(), included: z.boolean() }).optional(),
  token: z.string().min(32).max(128),
});

interface WeekRow {
  event: {
    id: string;
    starts_at: string;
    title_ar: string;
    title_en: string;
  } | null;
  included: boolean | null;
}

const hashOf = (token: string) =>
  createHash("sha256").update(token).digest("hex");

/**
 * POST /api/student-life/week: Student Life's weekly email (decisions.md,
 * Events), answered by the secure link without an account. With the token
 * alone it lists the week's events and what was marked; with an answer it
 * marks one event as included in their announcements or not.
 */
export const POST = async (request: Request) => {
  const json = respond(corsHeaders(request));
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: "invalid_token" }, 400);
  }
  const admin = createAdminClient();
  const { data: week } = await admin
    .schema("events")
    .from("student_life_weeks")
    .select("id, week_of, sent_at")
    .eq("token_hash", hashOf(parsed.data.token))
    .maybeSingle();
  const sent = week?.sent_at ? Date.parse(week.sent_at) : 0;
  if (!week || Date.now() - sent > VALID_FOR_MS) {
    return json({ error: "invalid_token" }, 400);
  }
  const items = admin.schema("events").from("student_life_week_events");
  const { answer } = parsed.data;
  if (answer) {
    const now = new Date().toISOString();
    const { data, error } = await items
      .update({ answered_at: now, included: answer.included })
      .eq("week_id", week.id)
      .eq("event_id", answer.event_id)
      .select("event_id");
    if (error || !data?.length) {
      return json({ error: "not_found" }, 404);
    }
    await admin
      .schema("events")
      .from("student_life_weeks")
      .update({ answered_at: now })
      .eq("id", week.id);
  }
  const { data: rows } = await items
    .select("included, event:events(id, title_en, title_ar, starts_at)")
    .eq("week_id", week.id);
  const events = ((rows ?? []) as unknown as WeekRow[])
    .filter((r) => r.event)
    .map((r) => ({
      ...(r.event as WeekRow["event"] & object),
      included: r.included,
    }))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return json({ events, week_of: week.week_of });
};
