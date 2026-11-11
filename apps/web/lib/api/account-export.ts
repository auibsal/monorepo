import "server-only";

import type { Database } from "@repo/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient<Database>;

/**
 * "Download your data" (decisions §11): every row the site keeps about the
 * person, as JSON, by table. Secrets that would let someone act as them
 * (the card's secret, calendar and Telegram codes, recovery-code hashes,
 * push endpoints) are left out, and so is what others wrote about them in
 * confidence (audition notes are only those they wrote themselves).
 */
const TABLES: readonly (readonly [string, string, string])[] = [
  ["access", "role_assignments", "user_id"],
  ["access", "two_step_resets", "user_id"],
  ["core", "personal_email_requests", "user_id"],
  ["core", "telegram_accounts", "user_id"],
  ["events", "check_ins", "user_id"],
  ["events", "event_staff", "user_id"],
  ["events", "invitations", "user_id"],
  ["events", "reminders", "user_id"],
  ["events", "rsvps", "user_id"],
  ["events", "waitlist", "user_id"],
  ["governance", "ballot_receipts", "user_id"],
  ["governance", "candidates", "user_id"],
  ["governance", "conflict_declarations", "user_id"],
  ["governance", "partner_affiliations", "user_id"],
  ["governance", "voters", "user_id"],
  ["journal", "call_alerts", "user_id"],
  ["journal", "contributors", "user_id"],
  ["journal", "piece_notes", "author_id"],
  ["journal", "original_openings", "opened_by"],
  ["journal", "prize_vote_receipts", "user_id"],
  ["journal", "saved_pieces", "user_id"],
  ["journal", "submission_drafts", "user_id"],
  ["journal", "submissions", "author_id"],
  ["membership", "activity_records", "user_id"],
  ["membership", "cards", "user_id"],
  ["membership", "certificates", "user_id"],
  ["membership", "guests", "user_id"],
  ["membership", "memberships", "user_id"],
  ["membership", "pledges", "user_id"],
  ["membership", "service_letters", "user_id"],
  ["membership", "service_records", "user_id"],
  ["membership", "verification_requests", "user_id"],
  ["membership", "wallet_passes", "user_id"],
  ["programmes", "audition_notes", "author_id"],
  ["programmes", "audition_signups", "user_id"],
  ["programmes", "opening_replies", "user_id"],
  ["programmes", "production_credits", "user_id"],
  ["programmes", "shift_signups", "user_id"],
  ["programmes", "six_words", "user_id"],
];

/** Columns never exported: they would let someone act as the person. */
const SECRET = new Set(["secret", "token", "code_hash", "endpoint", "keys"]);

const withoutSecrets = (row: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(row).filter(([key]) => !SECRET.has(key)));

export const exportAccount = async (admin: Client, userId: string) => {
  const [{ data: user }, { data: profile }] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin.schema("core").from("profiles").select("*").eq("id", userId),
  ]);
  const tables = await Promise.all(
    TABLES.map(async ([schema, table, column]) => {
      const { data } = await admin
        .schema(schema as "core")
        .from(table as "profiles")
        .select("*")
        .eq(column as "id", userId);
      return [
        `${schema}.${table}`,
        ((data ?? []) as Record<string, unknown>[]).map(withoutSecrets),
      ] as const;
    })
  );
  return {
    account: user?.user
      ? {
          created_at: user.user.created_at,
          email: user.user.email,
          last_sign_in_at: user.user.last_sign_in_at,
        }
      : null,
    exported_at: new Date().toISOString(),
    profile: (profile ?? []).map((row) =>
      withoutSecrets(row as Record<string, unknown>)
    ),
    tables: Object.fromEntries(tables.filter(([, rows]) => rows.length > 0)),
  };
};
