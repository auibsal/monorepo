import { z } from "zod";
import { type Client, unwrap } from "./client";

const BIO_MAX_WORDS = 50;

const WHITESPACE = /\s+/u;

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

const membership = (client: Client) => client.schema("membership");

export interface MemberStatus {
  activities: number;
  founding_until: string | null;
  /** One of the first Members, voting without activities in the founding year. */
  founding_voter: boolean;
  is_member: boolean;
  member_since: string | null;
  pending_pledges: ("human_authorship" | "member")[];
  tier: "member" | "associate" | "honorary" | null;
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
export const LIVE_DIGITS = /^[0-9]{8}$/u;

/** A card's code, as it appears in the link (20 hex characters). */
export const CARD_CODE = /^[0-9a-f]{20}$/u;

/** The member's own card (issued on first look). */
export const myCard = async (client: Client) =>
  unwrap(await membership(client).rpc("my_card"))?.[0] ?? null;

/**
 * The one kind of membership the signed-in account holds (decisions.md): a member (an AUIB address), a guest, or a partner's; null when it
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

/**
 * What the card shows beside its number (decisions §11): the role held now,
 * in each language, and the year since.
 */
export const myCardFace = async (client: Client) =>
  unwrap(await membership(client).rpc("my_card_face"))?.[0] ?? null;

/** The name on one's own card: an under-18's first name and last initial. */
export const myCardName = async (client: Client) =>
  unwrap(await membership(client).rpc("my_card_name"))?.[0] ?? null;

/** A Qalam student's school and summer, shown on their card. */
export const myCardQalam = async (client: Client) =>
  unwrap(await membership(client).rpc("my_card_qalam"))?.[0] ?? null;

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

/** A live Qalam card's school and summer, for its check page. */
export const verifyCardQalam = async (
  client: Client,
  code: string,
  digits?: string
) =>
  unwrap(
    await membership(client).rpc("verify_card_qalam", {
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

// ── Admin (members.manage / members.verify / roles.assign) ──────────────────

/** Member, Associate Member, Honorary Member (decisions.md). */
export const tiers = ["member", "associate", "honorary"] as const;
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

/** The Register: private, for the Executive Board and the Director of
 * Membership (`members.register`). Raises 42501 without the permission. */
export const register = async (client: Client) =>
  (unwrap(await membership(client).rpc("register")) ?? []) as DirectoryRow[];

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
