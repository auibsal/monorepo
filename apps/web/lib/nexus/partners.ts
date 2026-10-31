"use client";

import { useAuth } from "@repo/auth/provider";
import { unwrap } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";

export interface MyPartner extends Record<string, unknown> {
  id: string;
  name_ar: string | null;
  name_en: string;
  slug: string;
  status: string;
}

/** The partners whose team the signed-in person is on. */
export const useMyPartners = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (unwrap(await supabase.schema("governance").rpc("my_partners")) ??
        []) as MyPartner[],
    queryKey: ["partner-desk", "mine", user?.id ?? ""],
  });
};

export interface GuestOf extends Record<string, unknown> {
  name_ar: string | null;
  name_en: string;
  status: string;
}

/**
 * The partners the signed-in person is a guest of (verified) or waiting on
 * (pending), from their own affiliations.
 */
export const useGuestOf = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => {
      const rows =
        unwrap(
          await supabase
            .schema("governance")
            .from("partner_affiliations")
            .select("status, partner_id")
            .eq("user_id", user?.id ?? "")
            .in("status", ["verified", "pending"])
        ) ?? [];
      if (rows.length === 0) {
        return [] as GuestOf[];
      }
      const names =
        unwrap(await supabase.schema("governance").rpc("partner_names")) ?? [];
      return rows.map((row) => {
        const partner = names.find((n) => n.id === row.partner_id);
        return {
          name_ar: partner?.name_ar ?? null,
          name_en: partner?.name_en ?? "",
          status: row.status,
        };
      });
    },
    queryKey: ["affiliations", "guest-of", user?.id ?? ""],
  });
};
