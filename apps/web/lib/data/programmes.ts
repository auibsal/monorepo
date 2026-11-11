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

/** Who sees a page: the writer chooses; private by default. */
export const PAGE_VISIBILITY = ["private", "profile", "tour"] as const;
export type PageVisibility = (typeof PAGE_VISIBILITY)[number];

export const removalRequestSchema = z.object({
  content_url: z.url().max(2048).optional().or(z.literal("")),
  details: z.string().trim().min(1).max(4000),
  requester_email: z.email(),
  requester_name: z.string().trim().min(1).max(200),
});

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

// ── Get involved (decisions §18) ────────────────────────────────────────────

/** The application's states, as the database names them. */
export const APPLICATION_STATUSES = [
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
export const questionSchema = z.object({
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
