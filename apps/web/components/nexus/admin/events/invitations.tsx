"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { events } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ErrorLine } from "../kit";
import { MemberPicker, useMemberNames } from "../member-picker";
import { memberName } from "../members/directory";

/**
 * Who is invited to an invitation-only event. Only they (and the officers
 * who run it) see the event at all; they book it like any other.
 */
export const Invitations = ({ eventId }: { eventId: string }) => {
  const t = useTranslations("nexus.admin.event");
  const locale = useLocale();
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["admin", "event-invitations", eventId];
  const invited = useQuery({
    queryFn: () => events.invitations(supabase, eventId),
    queryKey,
  });
  const names = useMemberNames(invited.data?.map((i) => i.user_id) ?? []);
  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const add = useMutation({
    mutationFn: (userId: string) => events.invite(supabase, eventId, userId),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (userId: string) =>
      events.withdrawInvitation(supabase, eventId, userId),
    onSuccess: invalidate,
  });

  const nameOf = (userId: string) => {
    const profile = names.data?.find((p) => p.id === userId);
    return profile ? memberName(profile, locale) : "—";
  };

  return (
    <section className="grid max-w-4xl gap-4">
      <h2 className="type-title font-light">{t("invitations")}</h2>
      <p className="type-caption">{t("invitationsHint")}</p>
      {invited.data && invited.data.length === 0 ? (
        <p className="type-body text-text-secondary">{t("noInvitations")}</p>
      ) : null}
      <ul className="grid divide-y divide-line">
        {invited.data?.map((row) => (
          <li
            className="flex flex-wrap items-center justify-between gap-3 py-2"
            key={row.user_id}
          >
            <span className="font-medium">{nameOf(row.user_id)}</span>
            <Button
              disabled={remove.isPending}
              onClick={() => remove.mutate(row.user_id)}
              size="sm"
              variant="ghost"
            >
              {t("withdraw")}
            </Button>
          </li>
        ))}
      </ul>
      <MemberPicker
        label={t("invite")}
        onChange={(person) => {
          if (person) {
            add.mutate(person.id);
          }
        }}
        value={null}
      />
      <ErrorLine error={add.error ?? remove.error} />
    </section>
  );
};
