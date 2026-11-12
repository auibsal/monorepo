"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/provider";
import { journal, membership, names, unwrap } from "@/lib/data";
import type { Grant } from "@/lib/rbac";

/**
 * Data hooks. Every query runs with the member's session, so Row Level
 * Security decides what comes back. Keys include the user so signing in as
 * someone else refetches.
 */
export const queryKeys = {
  activity: (userId: string) => ["activity", userId] as const,
  calendarToken: (userId: string) => ["calendar-token", userId] as const,
  drafts: ["submission-drafts"] as const,
  grants: (userId: string) => ["grants", userId] as const,
  membership: (userId: string) => ["membership", "kind", userId] as const,
  openCalls: ["open-calls"] as const,
  profile: (userId: string) => ["profile", userId] as const,
  rsvps: (userId: string) => ["rsvps", userId] as const,
  shifts: (userId: string) => ["shifts", userId] as const,
  sixWords: (userId: string) => ["six-words", userId] as const,
  status: (userId: string) => ["status", userId] as const,
  submissions: (userId: string) => ["submissions", userId] as const,
  waitlist: (userId: string) => ["waitlist", userId] as const,
};

const useUserQuery = <T>(
  key: (userId: string) => readonly unknown[],
  fn: (userId: string) => Promise<T>
) => {
  const { user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: () => fn(user?.id ?? ""),
    queryKey: key(user?.id ?? ""),
  });
};

/** Which membership the account holds, and whether it is staff. */
export const useMyMembership = () => {
  const { supabase } = useAuth();
  return useUserQuery(queryKeys.membership, () =>
    membership.myMembership(supabase)
  );
};

export const useMemberStatus = () => {
  const { supabase } = useAuth();
  return useUserQuery(queryKeys.status, () => membership.myStatus(supabase));
};

export const useProfile = () => {
  const { supabase } = useAuth();
  return useUserQuery(queryKeys.profile, async (userId) => {
    // Private columns (personal email, email preference, the four parts
    // of each name) are not readable from the table, even for the owner:
    // they come from functions.
    const [profile, extra, parts] = await Promise.all([
      supabase
        .schema("core")
        .from("profiles")
        .select(
          "id, full_name_en, full_name_ar, preferred_name_en, preferred_name_ar, name_confirmed_at, bio, avatar_path, locale, camera_shy, setup_completed_at, verified_at, created_at, updated_at"
        )
        .eq("id", userId)
        .single(),
      supabase.schema("core").rpc("my_private_profile"),
      supabase.schema("core").rpc("my_name_parts"),
    ]);
    const row = unwrap(profile);
    if (!row) {
      throw new Error("profile_missing");
    }
    const own = unwrap(extra)?.[0];
    return {
      ...row,
      ...(unwrap(parts)?.[0] ?? {}),
      notify_email: own?.notify_email ?? true,
      personal_email: own?.personal_email ?? null,
      title_form: own?.title_form ?? null,
    };
  });
};

/**
 * Both names in all four parts (decisions.md): anyone without them
 * is asked at /welcome the next time they come in.
 */
export const hasAllNames = names.hasFourPartNames;

/** The member's active grants (for showing admin modules; RLS still decides). */
export const useGrants = () => {
  const { supabase } = useAuth();
  return useUserQuery(
    queryKeys.grants,
    async () =>
      (unwrap(await supabase.schema("access").rpc("my_permissions")) ??
        []) as Grant[]
  );
};

export const useActivity = () => {
  const { supabase } = useAuth();
  return useUserQuery(queryKeys.activity, async () => {
    const records =
      unwrap(
        await supabase
          .schema("membership")
          .from("activity_records")
          .select("id, kind, occurred_at, note, event_id")
          .order("occurred_at", { ascending: false })
          .limit(20)
      ) ?? [];
    // Events live in another schema, so they can't be embedded.
    const ids = [
      ...new Set(
        records.map((r) => r.event_id).filter((id): id is string => Boolean(id))
      ),
    ];
    const events = ids.length
      ? (unwrap(
          await supabase
            .schema("events")
            .from("events")
            .select("id, title_en, title_ar")
            .in("id", ids)
        ) ?? [])
      : [];
    return records.map((record) => ({
      ...record,
      event: events.find((event) => event.id === record.event_id) ?? null,
    }));
  });
};

// Officers may read everyone's RSVPs and waitlist places (check-in), so
// "mine" is filtered by the member, not left to Row Level Security.
export const useMyRsvps = () => {
  const { supabase } = useAuth();
  return useUserQuery(queryKeys.rsvps, async (userId) =>
    unwrap(
      await supabase
        .schema("events")
        .from("rsvps")
        .select(
          "id, ticket_code, from_waitlist, event:events(id, slug, title_en, title_ar, starts_at, ends_at, venue_en, venue_ar)"
        )
        .eq("status", "confirmed")
        .eq("user_id", userId)
    )
  );
};

export const useMyWaitlist = () => {
  const { supabase } = useAuth();
  return useUserQuery(queryKeys.waitlist, async (userId) =>
    unwrap(
      await supabase
        .schema("events")
        .from("waitlist")
        .select(
          "id, status, offered_until, event:events(id, slug, title_en, title_ar, starts_at)"
        )
        .in("status", ["waiting", "offered"])
        .eq("user_id", userId)
    )
  );
};

export const useOpenCalls = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: () => journal.openCalls(supabase),
    queryKey: queryKeys.openCalls,
  });
};

export const useMySubmissions = () => {
  const { supabase } = useAuth();
  return useUserQuery(queryKeys.submissions, () =>
    journal.mySubmissions(supabase)
  );
};

export const useMyShifts = () => {
  const { supabase } = useAuth();
  return useUserQuery(queryKeys.shifts, async () =>
    unwrap(
      await supabase
        .schema("programmes")
        .from("shift_signups")
        .select(
          "shift_id, status, shift:shifts(id, role_en, role_ar, starts_at, ends_at, location_en, location_ar)"
        )
        .neq("status", "canceled")
    )
  );
};

export const useCalendarToken = () => {
  const { supabase } = useAuth();
  return useUserQuery(queryKeys.calendarToken, () =>
    membership.calendarToken(supabase)
  );
};

/**
 * Whether the person holds or has held a role (decisions.md, Your account:
 * the Roles and service tab is shown by role).
 */
export const useHasRoles = () => {
  const { supabase, user } = useAuth();
  const roles = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (
        unwrap(
          await supabase
            .schema("access")
            .from("role_assignments")
            .select("id")
            .eq("user_id", user?.id ?? "")
            .limit(1)
        ) ?? []
      ).length > 0,
    queryKey: ["account", "has-roles", user?.id],
    staleTime: 5 * 60 * 1000,
  });
  return roles.data ?? false;
};

/** Whether an election or a members' vote is open (notice to voting). */
export const useElectionOpen = () => {
  const { supabase, user } = useAuth();
  const open = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (
        unwrap(
          await supabase
            .schema("governance")
            .from("elections")
            .select("id")
            .in("status", ["notice", "nominations", "review", "voting"])
            .limit(1)
        ) ?? []
      ).length > 0,
    queryKey: ["account", "election-open"],
    staleTime: 5 * 60 * 1000,
  });
  return open.data ?? false;
};

/**
 * The person's consent to sign electronically (E-SIGN; decisions.md,
 * Documents and forms): asked once, at sign-up or at the next sign-in.
 */
export const useEsign = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => {
      const rows = unwrap(await supabase.schema("core").rpc("my_esign")) ?? [];
      return rows[0] ?? { agreed_at: null, asked_at: null };
    },
    queryKey: ["account", "esign", user?.id],
  });
};
