"use client";

import { useAuth } from "@repo/auth/provider";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { DiwanSection, RowList } from "@/components/nexus/page";
import {
  InviteByEmail,
  OpenInvitations,
  ShareableLink,
} from "@/components/nexus/partner/workspace";
import {
  EmptyLine,
  ErrorState,
  SectionSpinner,
} from "@/components/nexus/states";
import { AdminHeading, ConfirmAction, ErrorLine } from "../kit";

interface SocietyGuest {
  created_at: string;
  name: string;
  user_id: string;
}

const KEY = ["society-guests"] as const;

/**
 * The Society's own guests (owner, Oct 31, 2026): people outside AUIB whom
 * Membership invites, by email or with a link, with no partner. They hold a
 * guest's membership and card: they book places, use perks and write for
 * calls open to them. A partner's guests are on the partner's dashboard.
 */
export const SocietyGuests = () => {
  const t = useTranslations("nexus.admin.members.guests");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const guests = useQuery({
    queryFn: async () => {
      const rows =
        unwrap(
          await supabase
            .schema("membership")
            .from("guests")
            .select("user_id, created_at")
            .is("ended_at", null)
            .order("created_at", { ascending: false })
        ) ?? [];
      if (rows.length === 0) {
        return [] as SocietyGuest[];
      }
      const profiles =
        unwrap(
          await supabase
            .schema("core")
            .from("profiles")
            .select("id, full_name_en, full_name_ar")
            .in(
              "id",
              rows.map((row) => row.user_id)
            )
        ) ?? [];
      return rows.map((row) => {
        const profile = profiles.find((p) => p.id === row.user_id);
        return {
          created_at: row.created_at,
          name:
            (locale === "ar" && profile?.full_name_ar) ||
            profile?.full_name_en ||
            "",
          user_id: row.user_id,
        };
      });
    },
    queryKey: [...KEY, locale],
  });
  const end = useMutation({
    mutationFn: async (userId: string) =>
      unwrap(
        await supabase
          .schema("membership")
          .from("guests")
          .update({ ended_at: new Date().toISOString() })
          .eq("user_id", userId)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });

  return (
    <div className="grid gap-14">
      <AdminHeading title={t("title")}>{t("lede")}</AdminHeading>
      <DiwanSection id="guests" title={t("current")}>
        {guests.isPending ? <SectionSpinner /> : null}
        {guests.isError ? (
          <ErrorState onRetry={() => guests.refetch()} />
        ) : null}
        {guests.data?.length === 0 ? <EmptyLine>{t("empty")}</EmptyLine> : null}
        {guests.data?.length ? (
          <RowList>
            {guests.data.map((guest) => (
              <li
                className="flex flex-wrap items-baseline justify-between gap-2 py-4"
                key={guest.user_id}
              >
                <span className="grid gap-1">
                  <span className="font-medium">{guest.name}</span>
                  <span className="type-caption">
                    {t("since", {
                      date: formatLongDate(guest.created_at, locale),
                    })}
                  </span>
                </span>
                <ConfirmAction
                  confirmLabel={t("end")}
                  description={t("endConfirm", { name: guest.name })}
                  disabled={end.isPending}
                  onConfirm={() => end.mutate(guest.user_id)}
                >
                  {t("end")}
                </ConfirmAction>
              </li>
            ))}
          </RowList>
        ) : null}
        <ErrorLine error={end.error} />
      </DiwanSection>
      <DiwanSection id="invite" title={t("invite")}>
        <InviteByEmail kind="guest" partnerId={null} />
        <ShareableLink partnerId={null} />
        <OpenInvitations kind="guest" partnerId={null} />
      </DiwanSection>
    </div>
  );
};
