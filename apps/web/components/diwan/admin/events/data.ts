"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { localized, unwrap } from "@/lib/data";
import { useGrants } from "@/lib/diwan/queries";
import { scopesFor } from "@/lib/rbac";

/** Programs, limited to the ones a permission covers (all for a global grant). */
export const useProgrammeOptions = (
  permission: "events.manage" | "programs.manage" | null = "events.manage"
) => {
  const { supabase } = useAuth();
  const locale = useLocale();
  const grants = useGrants();
  const programmes = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("core")
          .from("programmes")
          .select("id, slug, name_en, name_ar, is_active")
          .order("sort")
      ) ?? [],
    queryKey: ["admin", "programmes"],
  });
  const scopes = permission
    ? scopesFor(grants.data, permission, "programme")
    : ("all" as const);
  const options = (programmes.data ?? [])
    .filter((p) => scopes === "all" || scopes.includes(p.id))
    .map((p) => ({
      id: p.id,
      isActive: p.is_active,
      label: localized(p, "name", locale),
      slug: p.slug,
    }));
  return {
    canChooseNone: scopes === "all",
    isPending: programmes.isPending || grants.isPending,
    label: (id: string | null) =>
      (programmes.data ?? []).some((p) => p.id === id)
        ? localized(
            (programmes.data ?? []).find((p) => p.id === id) as Record<
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
  "id, slug, programme_id, title_en, title_ar, starts_at, ends_at, members_only, entry, capacity, rsvp_enabled, status";
