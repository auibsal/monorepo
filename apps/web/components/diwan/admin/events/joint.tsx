"use client";

import { useAuth } from "@repo/auth/provider";
import type { Locale } from "@repo/internationalization";
import { localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { JointChecklist } from "../../joint/checklist";
import { DiwanSection } from "../../page";
import { ErrorLine, Field, SaveButton, SelectInput } from "../kit";

const NONE = "none";

/**
 * An event run with a partner (the design review A41): the partner, from
 * the one register, and the checklist both sides keep; the partner's team
 * sees both on its dashboard.
 */
interface JointEvent {
  readonly id: string;
  readonly partner_id: string | null;
}

export const EventPartner = ({
  event,
}: {
  readonly event: JointEvent | null | undefined;
}) =>
  event ? <PartnerForm event={event} key={event.partner_id ?? NONE} /> : null;

const PartnerForm = ({ event }: { readonly event: JointEvent }) => {
  const t = useTranslations("diwan.joint");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [choice, setChoice] = useState(event.partner_id ?? NONE);
  const partners = useQuery({
    queryFn: async () =>
      unwrap(await supabase.schema("governance").rpc("partner_names")) ?? [],
    queryKey: ["admin", "partner-names"],
  });
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .from("events")
          .update({ partner_id: choice === NONE ? null : choice })
          .eq("id", event.id)
      ),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: ["admin", "event", event.id],
      }),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };
  return (
    <DiwanSection id="partner" title={t("title")}>
      <p className="type-body text-text-secondary">{t("lede")}</p>
      <form className="grid gap-4" onSubmit={submit}>
        <Field label={t("partner")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) => setChoice(e.target.value)}
              value={choice}
            >
              <option value={NONE}>{t("noPartner")}</option>
              {(partners.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {localized(p, "name", locale) || p.name_en}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <SaveButton
          disabled={choice === (event.partner_id ?? NONE)}
          pending={save.isPending}
        />
        <ErrorLine error={save.error} />
      </form>
      {event.partner_id ? <JointChecklist eventId={event.id} society /> : null}
    </DiwanSection>
  );
};
