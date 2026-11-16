import { z } from "zod";
import { type Client, currentDate, unwrap } from "./client";

export {
  FEEDBACK_DAYS,
  feedbackOpen,
  feedbackWindow,
  guestsBookBy,
  RATINGS,
} from "./event-times";

export const eventQuestionSchema = z.object({
  id: z.string().min(1).max(40),
  label_ar: z.string().min(1).max(200),
  label_en: z.string().min(1).max(200),
  required: z.boolean().default(false),
});

/** An event's registration questions, the site's own part of booking. */
export const eventQuestionsSchema = z.array(eventQuestionSchema).max(10);

/**
 * Access (decisions.md, Events: Access), two settings on every event. How:
 * Open (walk in, no booking) or Booking required (`rsvp`); or Invited only
 * (`invite`, named invitations). Who can come: the classes ticked, all four
 * being "Everyone".
 */
export const ENTRIES = ["open", "rsvp", "invite"] as const;
export type Entry = (typeof ENTRIES)[number];

export const CLASSES = ["member", "associate", "honorary", "guest"] as const;
export type EventClass = (typeof CLASSES)[number];

export const isEventClass = (value: string): value is EventClass =>
  (CLASSES as readonly string[]).includes(value);

/** All four classes ticked: "Everyone". */
export const isEveryone = (classes: readonly string[]) =>
  CLASSES.every((c) => classes.includes(c));

/**
 * The classes in words: "Everyone", or "Members only" for one class, or a
 * list ("Members, Associate Members and Guests"). `names` are the classes'
 * names in the page's language; `only` wraps a single class.
 */
export const classesLabel = (
  classes: readonly string[],
  {
    everyone,
    locale,
    names,
    only,
  }: {
    everyone: string;
    locale: "ar" | "en";
    names: Record<EventClass, string>;
    only?: (name: string) => string;
  }
) => {
  if (isEveryone(classes)) {
    return everyone;
  }
  const named = CLASSES.filter((c) => classes.includes(c)).map((c) => names[c]);
  if (named.length === 1 && only) {
    return only(named[0] ?? "");
  }
  return new Intl.ListFormat(locale === "ar" ? "ar" : "en-US", {
    type: "conjunction",
  }).format(named);
};

const events = (client: Client) => client.schema("events");

export const eventColumns =
  "id, slug, programme_id, title_en, title_ar, summary_en, summary_ar, venue_en, venue_ar, starts_at, ends_at, classes, capacity, rsvp_enabled, entry, status, image_path, off_campus, student_life_approved_on";

/**
 * Public events: every published event but the invitation-only ones,
 * which RLS also keeps to the invited.
 */
export const publicEvents = async (
  client: Client,
  {
    from = currentDate(),
    limit = 50,
    programmeId,
  }: { from?: Date; limit?: number; programmeId?: string } = {}
) => {
  let query = events(client)
    .from("events")
    .select(eventColumns)
    .eq("status", "published")
    .neq("entry", "invite")
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
  {
    before = currentDate(),
    limit = 20,
    programmeId,
  }: { before?: Date; limit?: number; programmeId?: string } = {}
) => {
  let query = events(client)
    .from("events")
    .select(eventColumns)
    .eq("status", "published")
    .neq("entry", "invite")
    .lt("starts_at", before.toISOString())
    .order("starts_at", { ascending: false })
    .limit(limit);
  if (programmeId) {
    query = query.eq("programme_id", programmeId);
  }
  return unwrap(await query);
};

/**
 * The nine major US food allergens (decisions.md, Events: "Good to know"),
 * in FALCPA's order; any other is named in words.
 */
export const ALLERGENS = [
  "milk",
  "eggs",
  "fish",
  "crustacean_shellfish",
  "tree_nuts",
  "peanuts",
  "wheat",
  "soy",
  "sesame",
] as const;

export type Allergen = (typeof ALLERGENS)[number];

export const isAllergen = (value: string): value is Allergen =>
  (ALLERGENS as readonly string[]).includes(value);

/** The site's own "Good to know" fields, set in the Diwan's editor. */
export const goodToKnowColumns =
  "serves_food, step_free, seating, allergens, language, accommodation_by, access_detail_en, access_detail_ar, served_en, served_ar, other_allergens_en, other_allergens_ar, content_note_en, content_note_ar, no_photos";

export const publicEvent = async (client: Client, eventSlug: string) =>
  unwrap(
    await events(client)
      .from("events")
      .select(
        `${eventColumns}, body_en, body_ar, questions, ${goodToKnowColumns}`
      )
      .eq("slug", eventSlug)
      .neq("entry", "invite")
      .in("status", ["published", "canceled"])
      .maybeSingle()
  );

/**
 * Who a public event is with (decisions.md, Events), from the one register:
 * "Co-sponsored by" its partners and campus partners (`cosponsor`), "Thanks
 * to" its sponsors in kind (`thanks`); active, listed entries only.
 */
export const eventOrganizations = async (client: Client, eventSlug: string) =>
  unwrap(
    await events(client).rpc("event_organizations", { event_slug: eventSlug })
  ) ?? [];

/** The partner a public event is held with (decisions §13), or null. */
export const eventHost = async (client: Client, eventSlug: string) =>
  unwrap(
    await events(client).rpc("event_host", { event_slug: eventSlug })
  )?.[0] ?? null;

const NAME_EN = /\bname\b/iu;
const NAME_AR = /اسم/u;

/**
 * Whether a booking question asks for the person's name. A booking carries
 * the member's name on the platform (decisions.md), so such a question
 * is answered with it rather than typed.
 */
export const asksForName = (question: {
  id: string;
  label_ar?: string | null;
  label_en?: string | null;
}) =>
  NAME_EN.test(`${question.id} ${question.label_en ?? ""}`) ||
  NAME_AR.test(question.label_ar ?? "");

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
 * Events between two times: everything the caller may see. Invitation-only
 * events reach only the invited.
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

/**
 * A session's outside links (design review A37): what was played or read,
 * shown with it among the program's past sessions. RLS shows the links of
 * the sessions the reader may see.
 */
export const sessionLinks = async (
  client: Client,
  eventIds: readonly string[]
) =>
  eventIds.length === 0
    ? []
    : (unwrap(
        await events(client)
          .from("session_links")
          .select("id, event_id, label_en, label_ar, url")
          .in("event_id", [...eventIds])
          .order("created_at")
      ) ?? []);

export const sessionLinkSchema = z.object({
  label_ar: z.string().trim().max(200),
  label_en: z.string().trim().max(200),
  url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v.startsWith("https://"), { message: "https_only" })
    .refine((v) => URL.canParse(v), { message: "invalid_url" }),
});

/** Where the person reading an event's page stands (events.booking_terms). */
export interface BookingTerms {
  /** May book: an Open event takes a booking only from a Guest on campus. */
  readonly books: boolean;
  readonly class: EventClass | null;
  /** Their class is ticked (or the event is Invited only). */
  readonly eligible: boolean;
  readonly guests_by: string | null;
  /** A Guest, on campus, after the 14 days before. */
  readonly guests_closed: boolean;
}

export const bookingTerms = async (client: Client, eventId: string) =>
  (unwrap(await events(client).rpc("booking_terms", { event_id: eventId })) ??
    null) as BookingTerms | null;

export const feedbackSchema = z.object({
  comment: z.string().trim().max(500).optional(),
  rating: z.number().int().min(1).max(5),
});

/** The person's own answer, if they gave one. */
export const myFeedback = async (client: Client, eventId: string) =>
  unwrap(
    await events(client)
      .from("feedback")
      .select("rating")
      .eq("event_id", eventId)
      .maybeSingle()
  );

export const sendFeedback = async (
  client: Client,
  eventId: string,
  answer: z.infer<typeof feedbackSchema>
) =>
  unwrap(
    await events(client)
      .from("feedback")
      .insert({
        comment: answer.comment || null,
        event_id: eventId,
        rating: answer.rating,
      })
  );

export interface FeedbackSummary {
  readonly average: number | null;
  readonly comments: { comment: string; rating: number }[];
  readonly count: number;
  readonly ratings: Record<string, number>;
}

/** What the event's managers read: counts and comments, never names. */
export const feedbackSummary = async (client: Client, eventId: string) =>
  unwrap(
    await events(client).rpc("feedback_summary", { event_id: eventId })
  ) as FeedbackSummary | null;

/** An event's program, in order (decisions.md, Events): the works it shows. */
export const programColumns =
  "id, position, title_en, title_ar, credit, year, length_minutes, line_en, line_ar, award_en, award_ar, still_path";

export const programItems = async (client: Client, eventId: string) =>
  unwrap(
    await events(client)
      .from("program_items")
      .select(programColumns)
      .eq("event_id", eventId)
      .order("position")
      .order("created_at")
  ) ?? [];

export type ProgramItem = Awaited<ReturnType<typeof programItems>>[number];
