"use client";

import type { Locale } from "@repo/internationalization";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { localized, unwrap } from "@/lib/data";
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
              {(partners.data ?? [])
                .filter((p) => p.relation === "partner")
                .map((p) => (
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

type Line = "cosponsor" | "thanks";
const LINES: readonly Line[] = ["cosponsor", "thanks"];
/** What each line takes from the register (decisions.md, Events). */
const TAKES: Record<Line, readonly string[]> = {
  cosponsor: ["partner", "campus"],
  thanks: ["sponsor"],
};

/**
 * Who the event is with (decisions.md, Events), picked from the one
 * register, never typed: "Co-sponsored by" its partners and campus
 * partners, "Thanks to" its sponsors in kind, at the foot of its page.
 */
export const EventOrganizations = ({
  eventId,
}: {
  readonly eventId: string;
}) => {
  const t = useTranslations("diwan.joint.organizations");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["admin", "event", eventId, "organizations"];
  const register = useQuery({
    queryFn: async () =>
      unwrap(await supabase.schema("governance").rpc("partner_names")) ?? [],
    queryKey: ["admin", "partner-names"],
  });
  const chosen = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .from("event_organizations")
          .select("partner_id, line")
          .eq("event_id", eventId)
      ) ?? [],
    queryKey,
  });
  const done = () => queryClient.invalidateQueries({ queryKey });
  const add = useMutation({
    mutationFn: async ({ line, partner }: { line: Line; partner: string }) =>
      unwrap(
        await supabase
          .schema("events")
          .from("event_organizations")
          .insert({ event_id: eventId, line, partner_id: partner })
      ),
    onSuccess: done,
  });
  const remove = useMutation({
    mutationFn: async (partner: string) =>
      unwrap(
        await supabase
          .schema("events")
          .from("event_organizations")
          .delete()
          .eq("event_id", eventId)
          .eq("partner_id", partner)
      ),
    onSuccess: done,
  });
  const nameOf = (id: string) => {
    const row = register.data?.find((p) => p.id === id);
    return row ? localized(row, "name", locale) || row.name_en : "";
  };
  const taken = new Set((chosen.data ?? []).map((c) => c.partner_id));
  return (
    <DiwanSection id="organizations" title={t("title")}>
      <p className="type-body text-text-secondary">{t("lede")}</p>
      {LINES.map((line) => {
        const here = (chosen.data ?? []).filter((c) => c.line === line);
        const options = (register.data ?? []).filter(
          (p) => TAKES[line].includes(p.relation) && !taken.has(p.id)
        );
        return (
          <div className="grid gap-3" key={line}>
            <p className="type-label">{t(`lines.${line}`)}</p>
            {here.length === 0 ? (
              <p className="type-body text-text-secondary">{t("none")}</p>
            ) : (
              <ul className="flex flex-wrap gap-x-6 gap-y-2">
                {here.map((c) => (
                  <li className="flex items-baseline gap-2" key={c.partner_id}>
                    <span>{nameOf(c.partner_id)}</span>
                    <button
                      className="link text-sm"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(c.partner_id)}
                      type="button"
                    >
                      {t("remove")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {options.length > 0 ? (
              <Field label={t(`add.${line}`)}>
                {(id) => (
                  <SelectInput
                    id={id}
                    onChange={(e) =>
                      e.target.value !== NONE &&
                      add.mutate({ line, partner: e.target.value })
                    }
                    value={NONE}
                  >
                    <option value={NONE}>{t("choose")}</option>
                    {options.map((p) => (
                      <option key={p.id} value={p.id}>
                        {localized(p, "name", locale) || p.name_en}
                      </option>
                    ))}
                  </SelectInput>
                )}
              </Field>
            ) : null}
          </div>
        );
      })}
      <ErrorLine error={add.error ?? remove.error} />
    </DiwanSection>
  );
};
