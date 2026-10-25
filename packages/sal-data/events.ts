import { z } from "zod";
import { type Client, unwrap } from "./client";

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

export const eventQuestionSchema = z.object({
  id: z.string().min(1).max(40),
  label_ar: z.string().min(1).max(200),
  label_en: z.string().min(1).max(200),
  required: z.boolean().default(false),
});

export const eventSchema = z
  .object({
    body_ar: z.string().optional(),
    body_en: z.string().optional(),
    capacity: z.number().int().positive().nullable(),
    ends_at: z.iso.datetime({ offset: true }).nullable(),
    entry: z.enum(["open", "rsvp", "invite"]).default("rsvp"),
    members_only: z.boolean(),
    programme_id: z.uuid().nullable(),
    questions: z.array(eventQuestionSchema).max(10).default([]),
    slug,
    starts_at: z.iso.datetime({ offset: true }),
    status: z.enum(["draft", "published", "cancelled"]),
    summary_ar: z.string().max(500).optional(),
    summary_en: z.string().max(500).optional(),
    title_ar: z.string().trim().min(1).max(200),
    title_en: z.string().trim().min(1).max(200),
    venue_ar: z.string().optional(),
    venue_en: z.string().optional(),
  })
  .refine((e) => !e.ends_at || new Date(e.ends_at) > new Date(e.starts_at), {
    message: "ends_before_start",
    path: ["ends_at"],
  });

export type EventInput = z.infer<typeof eventSchema>;

/** The ways in: just come, book a place, or by invitation. */
export const ENTRIES = ["open", "rsvp", "invite"] as const;
export type Entry = (typeof ENTRIES)[number];

const events = (client: Client) => client.schema("events");

export const eventColumns =
  "id, slug, programme_id, title_en, title_ar, summary_en, summary_ar, venue_en, venue_ar, starts_at, ends_at, members_only, capacity, rsvp_enabled, entry, status, image_path";

/**
 * Public events. Members-only events are filtered here AND by RLS, so they
 * never reach a public page whichever client runs the query.
 */
export const publicEvents = async (
  client: Client,
  {
    from = new Date(),
    limit = 50,
    programmeId,
  }: { from?: Date; limit?: number; programmeId?: string } = {}
) => {
  let query = events(client)
    .from("events")
    .select(eventColumns)
    .eq("status", "published")
    .eq("members_only", false)
    .gte("starts_at", from.toISOString())
    .order("starts_at")
    .limit(limit);
  if (programmeId) {
    query = query.eq("programme_id", programmeId);
  }
  return unwrap(await query);
};

/** Public events that have started, most recent first. */
export const pastPublicEvents = async (
  client: Client,
  { before = new Date(), limit = 20 }: { before?: Date; limit?: number } = {}
) =>
  unwrap(
    await events(client)
      .from("events")
      .select(eventColumns)
      .eq("status", "published")
      .eq("members_only", false)
      .lt("starts_at", before.toISOString())
      .order("starts_at", { ascending: false })
      .limit(limit)
  );

export const publicEvent = async (client: Client, eventSlug: string) =>
  unwrap(
    await events(client)
      .from("events")
      .select(`${eventColumns}, body_en, body_ar, questions`)
      .eq("slug", eventSlug)
      .eq("members_only", false)
      .in("status", ["published", "cancelled"])
      .maybeSingle()
  );

export const rsvp = async (
  client: Client,
  eventId: string,
  answers: Record<string, string> = {}
) =>
  unwrap(await events(client).rpc("rsvp", { answers, event_id: eventId })) as
    | "already"
    | "confirmed"
    | "waitlisted";

export const cancelRsvp = async (client: Client, eventId: string) =>
  unwrap(await events(client).rpc("cancel_rsvp", { event_id: eventId }));

/** The member's own confirmed RSVPs (officers may read everyone's). */
export const myRsvps = async (client: Client, userId: string) =>
  unwrap(
    await events(client)
      .from("rsvps")
      .select(
        `id, status, ticket_code, from_waitlist, event:events(${eventColumns})`
      )
      .eq("status", "confirmed")
      .eq("user_id", userId)
  );

/**
 * What's on between two times: everything the caller may see, and
 * members-only events as teasers (title, time and program only) for those
 * who may not. Invitation-only events reach only the invited.
 */
export const calendar = async (client: Client, from: Date, to: Date) =>
  unwrap(
    await events(client).rpc(
      "calendar",
      { from_at: from.toISOString(), to_at: to.toISOString() },
      { get: true }
    )
  ) ?? [];

export type CalendarEvent = Awaited<ReturnType<typeof calendar>>[number];

/**
 * AUIB's own dates between two times, as the hourly sync copied them from
 * the University's public calendar (core.external_events; public rows).
 */
export const universityCalendar = async (
  client: Client,
  from: Date,
  to: Date
) =>
  unwrap(
    await client
      .schema("core")
      .from("external_events")
      .select("id, title, starts_at, ends_at, all_day, location, url")
      .eq("source", "auib")
      .gte("starts_at", from.toISOString())
      .lt("starts_at", to.toISOString())
      .order("starts_at")
  ) ?? [];

export type UniversityEvent = Awaited<
  ReturnType<typeof universityCalendar>
>[number];

/** "Remind me": a reminder the day before an event without booking. */
export const remindMe = async (client: Client, eventId: string) =>
  unwrap(
    await events(client)
      .from("reminders")
      .upsert({ event_id: eventId }, { ignoreDuplicates: true })
  );

export const forgetReminder = async (client: Client, eventId: string) =>
  unwrap(
    await events(client).from("reminders").delete().eq("event_id", eventId)
  );

/** The events the signed-in person asked to be reminded of. */
export const myReminders = async (client: Client) =>
  (unwrap(await events(client).from("reminders").select("event_id")) ?? []).map(
    (r) => r.event_id
  );

/** Who is invited to an invitation-only event (its managers read this). */
export const invitations = async (client: Client, eventId: string) =>
  unwrap(
    await events(client)
      .from("invitations")
      .select("user_id, created_at")
      .eq("event_id", eventId)
  ) ?? [];

export const invite = async (client: Client, eventId: string, userId: string) =>
  unwrap(
    await events(client)
      .from("invitations")
      .upsert(
        { event_id: eventId, user_id: userId },
        { ignoreDuplicates: true }
      )
  );

export const withdrawInvitation = async (
  client: Client,
  eventId: string,
  userId: string
) =>
  unwrap(
    await events(client)
      .from("invitations")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", userId)
  );
