import "server-only";

import type { AdminClient } from "@repo/database/admin";

/** Who signs the Society's letters by email: today's President. */
export interface Signer {
  readonly name: string;
  readonly number: number | null;
}

/**
 * The person holding the President's seat today (global role, in force)
 * and their card number: the name and number their signature shows.
 */
export const presidentSigner = async (
  admin: AdminClient
): Promise<Signer | null> => {
  const now = new Date().toISOString();
  const { data: seat } = await admin
    .schema("access")
    .from("role_assignments")
    .select("user_id")
    .eq("role", "president")
    .eq("scope_type", "global")
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!seat) {
    return null;
  }
  const [{ data: profile }, { data: card }] = await Promise.all([
    admin
      .schema("core")
      .from("profiles")
      .select("full_name_en")
      .eq("id", seat.user_id)
      .maybeSingle(),
    admin
      .schema("membership")
      .from("cards")
      .select("number")
      .eq("user_id", seat.user_id)
      .maybeSingle(),
  ]);
  const name = profile?.full_name_en?.trim();
  return name ? { name, number: card?.number ?? null } : null;
};
