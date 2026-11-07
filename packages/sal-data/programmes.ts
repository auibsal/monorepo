import { z } from "zod";
import { type Client, unwrap } from "./client";

/**
 * A page typed at the Typewriter Tour (owner, Nov 7, 2026): kept as the
 * writer typed it. Six words is the invitation, not a rule the record
 * enforces; pages from spring 2026 hold what was typed.
 */
export const sixWordsSchema = z.object({
  language: z.enum(["en", "ar", "other"]),
  show_name: z.boolean().default(true),
  text: z.string().trim().min(1).max(400),
});

/** Who sees a page: the writer chooses; private by default. */
export const PAGE_VISIBILITY = ["private", "profile", "tour"] as const;
export type PageVisibility = (typeof PAGE_VISIBILITY)[number];

export const removalRequestSchema = z.object({
  content_url: z.url().max(2048).optional().or(z.literal("")),
  details: z.string().trim().min(1).max(4000),
  requester_email: z.email(),
  requester_name: z.string().trim().min(1).max(200),
});

export type RemovalRequestInput = z.infer<typeof removalRequestSchema>;

/** Next Stop care: removal requests are handled within 24 hours. */
export const REMOVAL_PROMISE_HOURS = 24;

export const youtubeEmbedUrl = (videoId: string) =>
  `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;

export const sixWordsWall = async (client: Client, limit = 200) =>
  unwrap(
    await client
      .schema("programmes")
      .rpc("six_words_wall", { max_results: limit })
  ) ?? [];

/** A member's pages they chose to show, for their profile. */
export const profileSixWords = async (client: Client, authorSlug: string) =>
  unwrap(
    await client
      .schema("programmes")
      .rpc("profile_six_words", { author_slug: authorSlug })
  ) ?? [];

/** The signed-in member's own pages, with who sees each. */
export const myPages = async (client: Client, userId: string) =>
  unwrap(
    await client
      .schema("programmes")
      .from("six_words")
      .select(
        "id, text, language, tour, station, visibility, publishable, photo_path, created_at"
      )
      .eq("user_id", userId)
      .order("created_at")
  ) ?? [];

/** The writer chooses who sees a page: the consent record. */
export const setPageVisibility = async (
  client: Client,
  pageId: string,
  visibility: PageVisibility
) =>
  unwrap(
    await client
      .schema("programmes")
      .from("six_words")
      .update({ visibility })
      .eq("id", pageId)
  );

export const programmes = async (client: Client) =>
  unwrap(
    await client.schema("core").from("programmes").select("*").order("sort")
  );

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtube-nocookie.com",
]);

/** The 11-character video id from a YouTube link (or the id itself); else null. */
export const youtubeId = (value: string) => {
  const input = value.trim();
  if (YOUTUBE_ID.test(input)) {
    return input;
  }
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (!YOUTUBE_HOSTS.has(url.hostname)) {
    return null;
  }
  const candidate =
    url.hostname === "youtu.be"
      ? url.pathname.slice(1)
      : (url.searchParams.get("v") ??
        url.pathname.split("/").filter(Boolean).at(-1) ??
        "");
  return YOUTUBE_ID.test(candidate) ? candidate : null;
};

const REEL_URL =
  /^https:\/\/(www\.)?(instagram\.com|tiktok\.com|youtube\.com|youtu\.be)\//;

/** Mirrors the reels.url check in the database. */
export const isReelUrl = (value: string) => REEL_URL.test(value.trim());

export const removalStatuses = [
  "open",
  "in_progress",
  "removed",
  "declined",
  "closed",
] as const;

/** Hours and minutes until (positive) or past (negative) a due time. */
export const timeLeft = (dueAt: string, now = new Date()) => {
  const minutes = Math.round(
    (new Date(dueAt).getTime() - now.getTime()) / 60_000
  );
  const abs = Math.abs(minutes);
  return {
    hours: Math.floor(abs / 60),
    minutes: abs % 60,
    overdue: minutes < 0,
  };
};

// ── Get involved ────────────────────────────────────────────────────────────

/** Open roles on Get involved (RLS shows members the open ones). */
export const openings = async (client: Client) =>
  unwrap(
    await client
      .schema("programmes")
      .from("openings")
      .select(
        "id, kind, owner, programme_id, event_id, places, title_en, title_ar, body_en, body_ar, skills, closes_at, is_open, created_at"
      )
      .order("created_at", { ascending: false })
  ) ?? [];

/**
 * Every open role, for anyone (owner, Nov 7, 2026: Get involved lists open
 * roles only): Council and team roles, event teams, Qalam mentors and the
 * Company's auditions.
 */
export const openPlaces = async (client: Client) =>
  unwrap(await client.schema("programmes").rpc("open_places")) ?? [];

/** The openings the signed-in member said they are interested in. */
export const myOpeningReplies = async (client: Client, userId: string) =>
  unwrap(
    await client
      .schema("programmes")
      .from("opening_replies")
      .select("opening_id, status")
      .eq("user_id", userId)
  ) ?? [];

export const replyToOpening = async (
  client: Client,
  openingId: string,
  note?: string
) =>
  unwrap(
    await client
      .schema("programmes")
      .from("opening_replies")
      .insert({ note: note?.trim() || null, opening_id: openingId })
  );

export const withdrawReply = async (
  client: Client,
  openingId: string,
  userId: string
) =>
  unwrap(
    await client
      .schema("programmes")
      .from("opening_replies")
      .delete()
      .eq("opening_id", openingId)
      .eq("user_id", userId)
  );

/** The skills a role asks for that the member has. */
export const matchingSkills = (
  wanted: readonly string[],
  mine: readonly string[]
) => wanted.filter((s) => mine.includes(s));

/** Rows that match the member's skills come first; the order is otherwise kept. */
export const matchedFirst = <T extends { skills: readonly string[] }>(
  rows: readonly T[],
  mine: readonly string[]
) =>
  [...rows].sort(
    (a, b) =>
      Number(matchingSkills(b.skills, mine).length > 0) -
      Number(matchingSkills(a.skills, mine).length > 0)
  );
