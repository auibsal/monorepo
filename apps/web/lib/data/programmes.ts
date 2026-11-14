import { z } from "zod";
import { type Client, currentDate, unwrap } from "./client";

/**
 * A page typed at the Typewriter Tour (decisions.md): kept as the
 * writer typed it. Six words is the invitation, not a rule the record
 * enforces; pages from spring 2026 hold what was typed.
 */
export const sixWordsSchema = z.object({
  language: z.enum(["en", "ar", "other"]),
  show_name: z.boolean().default(true),
  text: z.string().trim().min(1).max(400),
});

export const removalRequestSchema = z.object({
  content_url: z.url().max(2048).optional().or(z.literal("")),
  details: z.string().trim().min(1).max(4000),
  requester_email: z.email(),
  requester_name: z.string().trim().min(1).max(200),
});

/** The Tour's page: counts only (decisions.md, Members). */
export const sixWordsCounts = async (client: Client) =>
  (unwrap(await client.schema("programmes").rpc("six_words_counts")) ??
    [])[0] ?? {
    pages: 0,
    writers: 0,
  };

/** The writer's own pages, each with the event it was typed at. */
export const mySixWords = async (client: Client) =>
  unwrap(await client.schema("programmes").rpc("my_six_words")) ?? [];

export const programmes = async (client: Client) =>
  unwrap(
    await client.schema("core").from("programmes").select("*").order("sort")
  );

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/u;
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
  /^https:\/\/(www\.)?(instagram\.com|tiktok\.com|youtube\.com|youtu\.be)\//u;

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
export const timeLeft = (dueAt: string, now = currentDate()) => {
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

// ── Get involved (decisions.md, Get involved and roles) ────────────────────────────────────────────

/** The application's states, as the database names them. */
const APPLICATION_STATUSES = [
  "draft",
  "new",
  "talking",
  "picked",
  "not_picked",
  "offered",
  "accepted",
  "onboarded",
  "declined",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** A question an opening asks (programmes.openings.questions). */
const questionSchema = z.object({
  ar: z.string().trim().min(1).max(300),
  en: z.string().trim().min(1).max(300),
  key: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]{1,40}$/u),
  required: z.boolean(),
});
export type Question = z.infer<typeof questionSchema>;

export const questionsOf = (value: unknown): Question[] =>
  z.array(questionSchema).catch([]).parse(value);

/** Open roles for anyone (decisions §1): the public list. */
export const openPlaces = async (client: Client) =>
  unwrap(await client.schema("programmes").rpc("open_places")) ?? [];

/** One open opening, with its questions. */
export const openPlace = async (client: Client, openingId: string) =>
  (unwrap(
    await client
      .schema("programmes")
      .rpc("open_place", { opening_id: openingId })
  ) ?? [])[0] ?? null;

/** The signed-in member's applications, with each opening's title. */
export const myApplications = async (client: Client, userId: string) =>
  unwrap(
    await client
      .schema("programmes")
      .from("opening_replies")
      .select(
        "opening_id, status, answers, availability, lang, files, accommodation, gpa_consent_name, submitted_at, talk_at, offer_expires_at, updated_at, opening:openings(title_en, title_ar, role)"
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
  ) ?? [];

export interface ApplicationInput {
  readonly accommodation: string;
  readonly answers: Record<string, string>;
  readonly availability: string;
  readonly files: readonly string[];
  readonly gpaConsentName: string;
  readonly lang: "ar" | "en";
  readonly openingId: string;
}

/** Saves a draft, or sends the application (`submit`). */
export const saveApplication = async (
  client: Client,
  input: ApplicationInput,
  submit: boolean
) =>
  unwrap(
    await client.schema("programmes").rpc("save_application", {
      accommodation: input.accommodation,
      answers: input.answers,
      availability: input.availability,
      files: [...input.files],
      gpa_consent_name: input.gpaConsentName,
      lang: input.lang,
      opening_id: input.openingId,
      submit,
    })
  );

export const withdrawApplication = async (client: Client, openingId: string) =>
  unwrap(
    await client
      .schema("programmes")
      .rpc("withdraw_application", { opening_id: openingId })
  );

export const answerOffer = async (
  client: Client,
  openingId: string,
  accept: boolean
) =>
  unwrap(
    await client
      .schema("programmes")
      .rpc("answer_offer", { accept, opening_id: openingId })
  );

/** Links to the applicant's work: http(s) only, five at most. */
export const WORK_LINK = /^https?:\/\/\S+$/u;

// ── Next Stop's episodes (decisions.md, Next Stop) ──────────────────────────

const EPISODE_COLUMNS =
  "id, slug, number, season, title_en, title_ar, summary_en, summary_ar, youtube_id, youtube_id_ar, released_on, published_at, chapters, captions_en_path, captions_ar_path, thumbnail_path, duration_seconds";

const chapterSchema = z.object({
  at: z.number().int().min(0),
  title_ar: z.string().max(80),
  title_en: z.string().max(80),
});

export type Chapter = z.infer<typeof chapterSchema>;

/** An episode's chapters, in time order; anything malformed is left out. */
export const chaptersOf = (value: unknown): Chapter[] =>
  (Array.isArray(value) ? value : [])
    .map((c) => chapterSchema.safeParse(c))
    .flatMap((r) => (r.success ? [r.data] : []))
    .sort((a, b) => a.at - b.at);

/** "1:05" or "1:02:05", for a chapter's start. */
export const clockOf = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
};

const DIGITS = /^\d+$/u;

/** "1:05" or "1:02:05" back to seconds; null when it isn't a time. */
export const secondsOf = (value: string) => {
  const parts = value.trim().split(":");
  if (
    parts.length < 2 ||
    parts.length > 3 ||
    parts.some((p) => !DIGITS.test(p))
  ) {
    return null;
  }
  return parts.map(Number).reduce((total, n) => total * 60 + n, 0);
};

/** The published episodes, the latest first. */
export const publicEpisodes = async (client: Client) =>
  unwrap(
    await client
      .schema("programmes")
      .from("episodes")
      .select(EPISODE_COLUMNS)
      .not("published_at", "is", null)
      .order("released_on", { ascending: false, nullsFirst: false })
      .order("published_at", { ascending: false })
  ) ?? [];

export type PublicEpisode = Awaited<ReturnType<typeof publicEpisodes>>[number];

export const publicEpisode = async (client: Client, slug: string) =>
  unwrap(
    await client
      .schema("programmes")
      .from("episodes")
      .select(EPISODE_COLUMNS)
      .eq("slug", slug)
      .not("published_at", "is", null)
      .maybeSingle()
  );

/** The credits in the American order (programmes.episode_credits). */
export const episodeCredits = async (client: Client, episodeId: string) =>
  unwrap(
    await client
      .schema("programmes")
      .rpc("episode_credits", { episode: episodeId })
  ) ?? [];

export const CREDITS = [
  "directed_by",
  "produced_by",
  "host",
  "guests",
  "director_of_photography",
  "edited_by",
  "original_music",
  "title_design",
] as const;

export type Credit = (typeof CREDITS)[number];
