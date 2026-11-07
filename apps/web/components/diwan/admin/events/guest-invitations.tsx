"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { ErrorLine, Field } from "../kit";

/**
 * An event's lead invites guests by named email (decisions §2, §10): each
 * gets an email with a link that works for that address only, for
 * fourteen days, and joins as the Society's guest with a Guest card.
 */
export const GuestInvitations = ({ eventId }: { eventId: string }) => {
  const t = useTranslations("diwan.admin.event.guests");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["admin", "event-guest-invitations", eventId];
  const [email, setEmail] = useState("");
  const sent = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("partner_invitations")
          .select("id, email, accepted_at, revoked_at")
          .eq("event_id", eventId)
          .order("created_at", { ascending: false })
      ) ?? [],
    queryKey,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey });
  const invite = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("partner_invitations")
          .insert({ email: email.trim(), event_id: eventId, kind: "guest" })
      ),
    onSuccess: async () => {
      setEmail("");
      await invalidate();
    },
  });
  const withdraw = useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await supabase
          .schema("governance")
          .from("partner_invitations")
          .update({ revoked_at: new Date().toISOString() })
          .eq("id", id)
      ),
    onSuccess: invalidate,
  });
  const open = (sent.data ?? []).filter(
    (i) => !(i.accepted_at || i.revoked_at)
  );

  return (
    <section className="grid max-w-4xl gap-4">
      <h2 className="type-title font-light">{t("title")}</h2>
      <p className="type-caption">{t("hint")}</p>
      {open.length > 0 ? (
        <ul className="grid divide-y divide-line">
          {open.map((row) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 py-2"
              key={row.id}
            >
              <span dir="ltr">{row.email}</span>
              <Button
                disabled={withdraw.isPending}
                onClick={() => withdraw.mutate(row.id)}
                size="sm"
                variant="ghost"
              >
                {t("withdraw")}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          invite.mutate();
        }}
      >
        <Field className="w-72" label={t("email")}>
          {(id) => (
            <Input
              dir="ltr"
              id={id}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              value={email}
            />
          )}
        </Field>
        <Button disabled={invite.isPending} type="submit" variant="outline">
          {t("invite")}
        </Button>
      </form>
      {invite.isSuccess ? (
        <p className="type-caption" role="status">
          {t("sent")}
        </p>
      ) : null}
      <ErrorLine error={invite.error ?? withdraw.error} />
    </section>
  );
};
