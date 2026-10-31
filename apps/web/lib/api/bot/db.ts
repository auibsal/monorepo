import type { Database } from "@repo/database";
import { createAdminClient } from "@repo/database/admin";
import { keys } from "@repo/database/keys";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Admin = ReturnType<typeof createAdminClient>;

let client: Admin | undefined;
let publicClient: SupabaseClient<Database> | undefined;

/**
 * The privileged client (secret key, bypasses RLS). One per instance: it
 * holds no session, and warm instances serve many updates. Acting for a
 * member goes through the core.telegram_* functions, which set the member's
 * claims so RLS and permissions apply as they would in the Nexus.
 */
export const db = () => {
  client ??= createAdminClient();
  return client;
};

export type Db = Admin;

/**
 * The publishable-key client for public reads (events, Waraq pieces): RLS
 * runs as a guest, so nothing members-only or unpublished can reach a group
 * post or an inline result whatever the query says.
 */
export const anon = () => {
  if (!publicClient) {
    const { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_URL } =
      keys();
    if (!(NEXT_PUBLIC_SUPABASE_URL && NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) {
      throw new Error("The bot needs the Supabase URL and publishable key.");
    }
    publicClient = createClient<Database>(
      NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      }
    );
  }
  return publicClient;
};

export interface Account {
  locale: "en" | "ar";
  member: boolean;
  name_ar: string | null;
  name_en: string;
  notify: boolean;
  user_id: string;
}

export interface EventRow {
  capacity: number | null;
  confirmed: number;
  ends_at: string | null;
  id: string;
  members_only: boolean;
  mine: "confirmed" | "waitlisted" | null;
  rsvp_enabled: boolean;
  slug: string;
  starts_at: string;
  summary_ar: string | null;
  summary_en: string | null;
  title_ar: string;
  title_en: string;
  venue_ar: string | null;
  venue_en: string | null;
}

export interface Group {
  /** members: the main group; staff: officers only (the Diwan group). */
  audience: "members" | "staff";
  chat_id: number;
  lang: "en" | "ar" | "both";
  title: string | null;
  topics: Partial<Record<string, number>>;
}

export const whoami = async (telegramId: number) => {
  const { data, error } = await db()
    .schema("core")
    .rpc("telegram_whoami", { telegram_id: telegramId });
  if (error) {
    throw error;
  }
  return (data ?? null) as Account | null;
};

export const visibleEvents = async (
  telegramId: number,
  { eventId, max = 6 }: { eventId?: string; max?: number } = {}
) => {
  const { data, error } = await db().schema("core").rpc("telegram_events", {
    event_id: eventId,
    max_rows: max,
    telegram_id: telegramId,
  });
  if (error) {
    throw error;
  }
  return (data ?? []) as unknown as EventRow[];
};

export const group = async (chatId: number) => {
  const { data, error } = await db()
    .schema("core")
    .from("telegram_groups")
    .select("audience, chat_id, title, lang, topics")
    .eq("chat_id", chatId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data as Group | null;
};

export const groups = async () => {
  const { data, error } = await db()
    .schema("core")
    .from("telegram_groups")
    .select("audience, chat_id, title, lang, topics");
  if (error) {
    throw error;
  }
  return (data ?? []) as Group[];
};

/** Whether a Telegram account is linked to someone holding a Society role. */
export const isStaffAccount = async (telegramId: number) => {
  const { data, error } = await db()
    .schema("core")
    .rpc("telegram_is_staff", { telegram_id: telegramId });
  if (error) {
    throw error;
  }
  return data === true;
};

/** A public setting's value, or null. */
export const setting = async (key: string) => {
  const { data } = await db()
    .schema("core")
    .from("settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? null;
};
