"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { localized, unwrap } from "@/lib/data";
import { useGrants } from "@/lib/diwan/queries";
import { scopesFor } from "@/lib/rbac";

/** Programs, limited to the ones a permission covers (all for a global grant). */
export const useProgramOptions = (
  permission: "events.manage" | "programs.manage" | null = "events.manage"
) => {
  const { supabase } = useAuth();
  const locale = useLocale();
  const grants = useGrants();
  const programs = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("api")
          .from("programs")
          .select("id, slug, name_en, name_ar, is_active")
          .order("sort")
      ) ?? [],
    queryKey: ["admin", "programs"],
  });
  const scopes = permission
    ? scopesFor(grants.data, permission, "program")
    : ("all" as const);
  const options = (programs.data ?? [])
    .filter((p) => scopes === "all" || scopes.includes(p.id))
    .map((p) => ({
      id: p.id,
      isActive: p.is_active,
      label: localized(p, "name", locale),
      slug: p.slug,
    }));
  return {
    canChooseNone: scopes === "all",
    isPending: programs.isPending || grants.isPending,
    label: (id: string | null) =>
      (programs.data ?? []).some((p) => p.id === id)
        ? localized(
            (programs.data ?? []).find((p) => p.id === id) as Record<
              string,
              unknown
            >,
            "name",
            locale
          )
        : null,
    options,
  };
};

export const adminEventColumns =
  "id, slug, program_id, title_en, title_ar, starts_at, ends_at, classes, entry, capacity, rsvp_enabled, status";
