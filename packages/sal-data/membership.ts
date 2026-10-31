import { z } from "zod";
import { type Client, unwrap } from "./client";

export const BIO_MAX_WORDS = 50;

const WHITESPACE = /\s+/;

export const wordCount = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(WHITESPACE).length : 0;
};

export const profileSchema = z.object({
  bio: z
    .string()
    .max(600)
    .refine((v) => wordCount(v) <= BIO_MAX_WORDS, { message: "bio_too_long" })
    .optional(),
  camera_shy: z.boolean(),
  full_name_ar: z.string().trim().max(120).optional(),
  full_name_en: z.string().trim().min(1).max(120),
  locale: z.enum(["en", "ar"]),
  notify_email: z.boolean(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

const membership = (client: Client) => client.schema("membership");

export interface MemberStatus {
  activities: number;
  founding_until: string | null;
  /** One of the first Members, voting without activities in the founding year. */
  founding_voter: boolean;
  is_member: boolean;
  member_since: string | null;
  pending_pledges: ("human_authorship" | "member")[];
  tier: "member" | "fellow" | "honorary" | "alumni" | null;
  verified: boolean;
  voting_member: boolean;
}

export const myStatus = async (
  client: Client
): Promise<MemberStatus | null> => {
  const rows = unwrap(await membership(client).rpc("my_status"));
  return (rows?.[0] as MemberStatus | undefined) ?? null;
};

/** Constitution: a Voting Member has this many activities this or last semester. */
export const VOTING_ACTIVITIES = 2;

export const acceptPledge = async (
  client: Client,
  kind: "human_authorship" | "member",
  version: string
) => unwrap(await membership(client).rpc("accept_pledge", { kind, version }));

export const calendarToken = async (client: Client) =>
  unwrap(await membership(client).rpc("calendar_token"));

export const resetCalendarToken = async (client: Client) =>
  unwrap(await membership(client).rpc("reset_calendar_token"));

// ── The membership card ─────────────────────────────────────────────────────

/** The path the card's QR links to: anyone's camera opens the check. */
export const cardPath = (code: string) => `/verify/member/${code}`;

/** The live link: the card's path and the code of this 30-second step. */
export const livePath = (code: string, digits: string) =>
  `${cardPath(code)}?t=${digits}`;

/** Live digits, as they appear in the link. */
export const LIVE_DIGITS = /^[0-9]{8}$/;

/** A card's code, as it appears in the link (20 hex characters). */
export const CARD_CODE = /^[0-9a-f]{20}$/;

/** The member's own card (issued on first look). */
export const myCard = async (client: Client) =>
  unwrap(await membership(client).rpc("my_card"))?.[0] ?? null;

/**
 * The one kind of membership the signed-in account holds (owner, Oct 31,
 * 2026): a member (an AUIB address), a guest, or a partner's; null when it
 * holds none yet. Staff: a member holding a Society role.
 */
export type MembershipKind = "member" | "guest" | "partner";

export const myMembership = async (client: Client) => {
  const row = unwrap(await membership(client).rpc("my_membership"))?.[0];
  return {
    kind: (row?.kind ?? null) as MembershipKind | null,
    staff: Boolean(row?.staff),
  };
};

/** A new code for a lost or shared card; the old link stops working. */
export const reissueCard = async (client: Client) =>
  unwrap(await membership(client).rpc("reissue_card"))?.[0] ?? null;

/** The public check of a card by its code (anyone, signed in or not). */
export const verifyCard = async (
  client: Client,
  code: string,
  digits?: string
) =>
  unwrap(
    await membership(client).rpc("verify_card", {
      code,
      ...(digits ? { digits } : {}),
    })
  )?.[0] ?? null;

// ── The personal email (verified from a link; one address, one person) ──────

export interface PersonalEmail {
  email: string | null;
  pending_email: string | null;
  pending_since: string | null;
  verified: boolean;
}

export const myPersonalEmail = async (
  client: Client
): Promise<PersonalEmail | null> =>
  (unwrap(await client.schema("core").rpc("my_personal_email"))?.[0] as
    | PersonalEmail
    | undefined) ?? null;

/** Raises email_invalid, email_auib or email_in_use (DataError message). */
export const requestPersonalEmail = async (client: Client, email: string) =>
  unwrap(await client.schema("core").rpc("request_personal_email", { email }));

export const removePersonalEmail = async (client: Client) =>
  unwrap(await client.schema("core").rpc("remove_personal_email"));

/** Why an address was refused, from the database's message. */
export const personalEmailError = (
  error: unknown
): "email_auib" | "email_in_use" | "email_invalid" | "unknown" => {
  const message = error instanceof Error ? error.message : "";
  for (const code of ["email_auib", "email_in_use", "email_invalid"] as const) {
    if (message.includes(code)) {
      return code;
    }
  }
  return "unknown";
};

/** The certificates a card's check page lists (only if its owner allows). */
export const cardRecord = async (client: Client, code: string) =>
  unwrap(await membership(client).rpc("card_record", { code })) ?? [];

// ── What members tell us about themselves (core.member_details) ─────────────

export const affiliations = [
  "student",
  "alumni",
  "faculty",
  "staff",
  "community",
] as const;
export const studyLevels = [
  "foundation",
  "undergraduate",
  "graduate",
  "other",
] as const;
export const genders = ["woman", "man", "prefer_not"] as const;
export const memberLanguages = [
  "ar",
  "en",
  "ku",
  "tr",
  "syc",
  "fr",
  "de",
  "other",
] as const;
export const interests = [
  "poetry",
  "fiction",
  "nonfiction",
  "theater",
  "film",
  "music",
  "visual_art",
  "photography",
  "debate",
  "journalism",
  "translation",
  "calligraphy",
  "reading",
] as const;
export const skills = [
  "writing",
  "editing",
  "translation",
  "design",
  "photography",
  "video",
  "social_media",
  "acting",
  "directing",
  "stage_crew",
  "music",
  "organizing",
  "web",
] as const;
export const heardFrom = [
  "friend",
  "instagram",
  "telegram",
  "event",
  "poster",
  "class",
  "website",
  "other",
] as const;

const year = (min: number, max: number) =>
  z.number().int().min(min).max(max).nullable();

/** Every answer is optional; the database checks the same limits. */
export const detailsSchema = z.object({
  affiliation: z.enum(affiliations).nullable(),
  birth_year: year(1930, 2015),
  city: z.string().trim().max(80).nullable(),
  college: z.string().trim().max(120).nullable(),
  gender: z.enum(genders).nullable(),
  graduation_year: year(1990, 2100),
  heard_from: z.enum(heardFrom).nullable(),
  interests: z.array(z.enum(interests)),
  languages: z.array(z.enum(memberLanguages)),
  major: z.string().trim().max(120).nullable(),
  photo_consent: z.boolean(),
  research_consent: z.boolean(),
  skills: z.array(z.enum(skills)),
  student_id: z.string().trim().max(20).nullable(),
  study_level: z.enum(studyLevels).nullable(),
  volunteer: z.boolean(),
});

export type MemberDetails = z.infer<typeof detailsSchema>;

export const emptyDetails: MemberDetails = {
  affiliation: null,
  birth_year: null,
  city: null,
  college: null,
  gender: null,
  graduation_year: null,
  heard_from: null,
  interests: [],
  languages: [],
  major: null,
  photo_consent: false,
  research_consent: false,
  skills: [],
  student_id: null,
  study_level: null,
  volunteer: false,
};

const detailColumns =
  "affiliation, birth_year, city, college, gender, graduation_year, heard_from, interests, languages, major, photo_consent, research_consent, skills, student_id, study_level, volunteer";

/** The member's own answers (RLS: only theirs, or members.manage). */
export const myDetails = async (
  client: Client,
  userId: string
): Promise<MemberDetails> => {
  const row = unwrap(
    await client
      .schema("core")
      .from("member_details")
      .select(detailColumns)
      .eq("user_id", userId)
      .maybeSingle()
  );
  return row ? ({ ...emptyDetails, ...row } as MemberDetails) : emptyDetails;
};

export const saveDetails = async (
  client: Client,
  userId: string,
  details: MemberDetails
) =>
  unwrap(
    await client
      .schema("core")
      .from("member_details")
      .upsert({ ...detailsSchema.parse(details), user_id: userId })
  );

export interface InsightItem {
  /** Null when fewer than five members gave this answer. */
  count: number | null;
  value: string;
}

export interface MemberInsights {
  answered: number;
  counted: number;
  facets: Partial<Record<string, InsightItem[]>>;
  members: number;
  volunteers: number;
}

/** Counts for the Diwan (members.manage), from consenting members only. */
export const memberInsights = async (client: Client) =>
  unwrap(
    await client.schema("core").rpc("member_insights")
  ) as MemberInsights | null;

// ── Admin (members.manage / members.verify / roles.assign) ──────────────────

export const tiers = ["member", "fellow", "honorary", "alumni"] as const;
export type Tier = (typeof tiers)[number];

export interface DirectoryRow {
  activities: number;
  created_at: string;
  email: string;
  full_name_ar: string | null;
  full_name_en: string;
  member_since: string | null;
  tier: Tier | null;
  user_id: string;
  verified_at: string | null;
  voting_member: boolean;
}

/** Every account with its sign-in email. Raises 42501 without the permission. */
export const directory = async (client: Client) =>
  (unwrap(await membership(client).rpc("directory")) ?? []) as DirectoryRow[];

export const manualActivitySchema = z.object({
  note: z.string().trim().min(1).max(500),
  occurred_at: z.iso.datetime({ offset: true }),
  target_user: z.uuid(),
});

export const addManualActivity = async (
  client: Client,
  input: z.infer<typeof manualActivitySchema>
) =>
  unwrap(
    await membership(client).rpc(
      "add_manual_activity",
      manualActivitySchema.parse(input)
    )
  );

export const setTier = async (client: Client, userId: string, tier: Tier) =>
  unwrap(
    await membership(client).rpc("set_tier", {
      new_tier: tier,
      target_user: userId,
    })
  );

export const decideVerification = async (
  client: Client,
  requestId: string,
  approve: boolean,
  note?: string
) =>
  unwrap(
    await membership(client).rpc("decide_verification", {
      approve,
      note: note?.trim() || undefined,
      request_id: requestId,
    })
  );
