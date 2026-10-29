"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { journal, localized, membership, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import {
  BilingualField,
  ConfirmAction,
  DateTimeField,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";
import { useMemberNames } from "../member-picker";
import { memberName } from "../members/directory";

type Skill = (typeof membership.skills)[number];

/** The skills a role or shift wants, from the same list as Profile. */
export const SkillsPicker = ({
  onChange,
  value,
}: {
  onChange: (skills: Skill[]) => void;
  value: readonly string[];
}) => {
  const t = useTranslations("nexus.admin.programmes.callboard");
  const ts = useTranslations("nexus.details.skills");
  const id = useId();
  return (
    <fieldset className="grid gap-2">
      <legend className="font-medium text-sm">{t("skills")}</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {membership.skills.map((skill) => (
          <div className="flex items-center gap-2" key={skill}>
            <Checkbox
              checked={value.includes(skill)}
              id={`${id}-${skill}`}
              onCheckedChange={(on) =>
                onChange(
                  (on === true
                    ? [...value, skill]
                    : value.filter((s) => s !== skill)) as Skill[]
                )
              }
            />
            <Label htmlFor={`${id}-${skill}`}>{ts(skill)}</Label>
          </div>
        ))}
      </div>
    </fieldset>
  );
};

/** What an opening offers: a role, an Apprenticeship or a First Ink place. */
export const openingKinds = ["role", "apprenticeship", "first_ink"] as const;
type OpeningKind = (typeof openingKinds)[number];

const blank = {
  body: { ar: "", en: "" },
  closes_at: null as string | null,
  desk: "" as journal.Desk | "",
  kind: "role" as OpeningKind,
  partner_id: "",
  places: "",
  skills: [] as Skill[],
  term_from: "",
  term_to: "",
  title: { ar: "", en: "" },
};

/** The row an opening is saved as; places only for the two kinds of place. */
const openingRow = (form: typeof blank, programmeId: string) => {
  const place = form.kind !== "role";
  return {
    body_ar: form.body.ar || null,
    body_en: form.body.en || null,
    closes_at: form.closes_at,
    desk: form.kind === "apprenticeship" && form.desk ? form.desk : null,
    kind: form.kind,
    partner_id: form.kind === "first_ink" ? form.partner_id : null,
    places: place && form.places ? Number(form.places) : null,
    programme_id: programmeId,
    skills: form.skills,
    term_from: place && form.term_from ? form.term_from : null,
    term_to: place && form.term_to ? form.term_to : null,
    title_ar: form.title.ar,
    title_en: form.title.en,
  };
};

/**
 * The program's openings on the Callboard (owner, Oct 29, 2026: the careers
 * page): roles, one-term Apprenticeships (in a Qirtas section or the
 * program) and First Ink mentor places with the partner school. Post one,
 * see who is interested (each reply is also emailed to the program's
 * managers), give the places, and close it once it's filled. An
 * apprenticeship's or First Ink's sessions are the shifts of its own rota,
 * made with it, so their hours count as service; completing an
 * apprenticeship drafts its certificate.
 */
export const Openings = ({ programmeId }: { programmeId: string }) => {
  const t = useTranslations("nexus.admin.programmes.callboard");
  const tj = useTranslations("nexus.admin.journal");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(blank);
  const queryKey = ["admin", "programmes", "openings", programmeId];

  const list = useQuery({
    queryFn: async () => {
      const rows =
        unwrap(
          await supabase
            .schema("programmes")
            .from("openings")
            .select(
              "id, kind, title_en, title_ar, skills, closes_at, is_open, places, term_from, term_to, opening_replies(user_id, note, created_at), placements(id, user_id, status)"
            )
            .eq("programme_id", programmeId)
            .order("created_at", { ascending: false })
        ) ?? [];
      return rows;
    },
    queryKey,
  });
  const names = useMemberNames(
    (list.data ?? []).flatMap((o) => o.opening_replies.map((r) => r.user_id))
  );
  const partners = useQuery({
    enabled: form.kind === "first_ink",
    queryFn: async () =>
      unwrap(await supabase.schema("governance").rpc("partner_names")) ?? [],
    queryKey: ["admin", "partner-names"],
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const add = useMutation({
    mutationFn: async () => {
      const place = form.kind !== "role";
      const opening = unwrap(
        await supabase
          .schema("programmes")
          .from("openings")
          .insert(openingRow(form, programmeId))
          .select("id")
          .single()
      );
      // Its sessions: a rota of its own, whose shifts count as service.
      if (place && opening) {
        unwrap(
          await supabase
            .schema("programmes")
            .from("rotas")
            .insert({
              ends_on: form.term_to || null,
              opening_id: opening.id,
              programme_id: programmeId,
              starts_on: form.term_from || null,
              title_ar: form.title.ar,
              title_en: form.title.en,
            })
        );
      }
    },
    onSuccess: async () => {
      setForm(blank);
      await refresh();
    },
  });
  const close = useMutation({
    mutationFn: async ({ id, open }: { id: string; open: boolean }) =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("openings")
          .update({ is_open: open })
          .eq("id", id)
      ),
    onSuccess: refresh,
  });

  const give = useMutation({
    mutationFn: async ({
      openingId,
      userId,
    }: {
      openingId: string;
      userId: string;
    }) =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("placements")
          .insert({ opening_id: openingId, user_id: userId })
      ),
    onSuccess: refresh,
  });
  const withdraw = useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("placements")
          .update({ status: "withdrawn" })
          .eq("id", id)
      ),
    onSuccess: refresh,
  });
  const complete = useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await supabase
          .schema("programmes")
          .rpc("complete_apprenticeship", { placement: id })
      ),
    onSuccess: refresh,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    add.mutate();
  };

  return (
    <div className="grid gap-8">
      <p className="type-body max-w-3xl text-text-secondary">{t("lede")}</p>
      <form className="grid max-w-3xl gap-4" onSubmit={submit}>
        <Field hint={t(`kindHints.${form.kind}`)} label={t("kind")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({ ...f, kind: e.target.value as OpeningKind }))
              }
              value={form.kind}
            >
              {openingKinds.map((k) => (
                <option key={k} value={k}>
                  {t(`kinds.${k}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <BilingualField
          label={t("title")}
          maxLength={200}
          onChange={(title) => setForm((f) => ({ ...f, title }))}
          required
          value={form.title}
        />
        <BilingualField
          label={t("body")}
          maxLength={2000}
          multiline
          onChange={(body) => setForm((f) => ({ ...f, body }))}
          rows={3}
          value={form.body}
        />
        <SkillsPicker
          onChange={(skills) => setForm((f) => ({ ...f, skills }))}
          value={form.skills}
        />
        {form.kind === "apprenticeship" ? (
          <Field hint={t("deskHint")} label={t("desk")}>
            {(id) => (
              <SelectInput
                id={id}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    desk: e.target.value as journal.Desk | "",
                  }))
                }
                value={form.desk}
              >
                <option value="">{t("noDesk")}</option>
                {journal.desks.map((d) => (
                  <option key={d} value={d}>
                    {tj(`desks.${d}`)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
        ) : null}
        {form.kind === "first_ink" ? (
          <Field hint={t("partnerHint")} label={t("partner")}>
            {(id) => (
              <SelectInput
                id={id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, partner_id: e.target.value }))
                }
                required
                value={form.partner_id}
              >
                <option value="">{t("choosePartner")}</option>
                {(partners.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {localized(p, "name", locale)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
        ) : null}
        {form.kind === "role" ? null : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("places")}>
              {(id) => (
                <Input
                  dir="ltr"
                  id={id}
                  max={100}
                  min={1}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, places: e.target.value }))
                  }
                  type="number"
                  value={form.places}
                />
              )}
            </Field>
            <Field label={t("termFrom")}>
              {(id) => (
                <Input
                  dir="ltr"
                  id={id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, term_from: e.target.value }))
                  }
                  required={form.kind === "apprenticeship"}
                  type="date"
                  value={form.term_from}
                />
              )}
            </Field>
            <Field label={t("termTo")}>
              {(id) => (
                <Input
                  dir="ltr"
                  id={id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, term_to: e.target.value }))
                  }
                  required={form.kind === "apprenticeship"}
                  type="date"
                  value={form.term_to}
                />
              )}
            </Field>
          </div>
        )}
        <DateTimeField
          label={t("closes")}
          onChange={(closes_at) => setForm((f) => ({ ...f, closes_at }))}
          value={form.closes_at}
        />
        <SaveButton pending={add.isPending} success={add.isSuccess} />
        <ErrorLine error={add.error} />
      </form>

      <ul className="grid divide-y divide-line">
        {list.data?.length === 0 ? (
          <li className="type-body py-3 text-text-secondary">{t("empty")}</li>
        ) : null}
        {list.data?.map((o) => (
          <li className="grid gap-2 py-4" key={o.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="type-subheading">
                {localized(o, "title", locale)}
                {o.kind === "role"
                  ? ""
                  : ` · ${t(`kinds.${o.kind as OpeningKind}`)}`}
              </p>
              <p className="type-caption">
                {o.is_open ? t("open") : t("closed")}
                {o.closes_at
                  ? ` · ${t("closesOn", { date: formatLongDate(o.closes_at, locale) })}`
                  : ""}
              </p>
            </div>
            <p className="type-caption">
              {t("replies", { count: o.opening_replies.length })}
            </p>
            <ul className="grid gap-1">
              {o.opening_replies.map((r) => {
                const person = names.data?.find((n) => n.id === r.user_id);
                const placed = o.placements.find(
                  (pl) => pl.user_id === r.user_id && pl.status !== "withdrawn"
                );
                return (
                  <li
                    className="flex flex-wrap items-center gap-x-4 gap-y-1"
                    key={r.user_id}
                  >
                    <span className="type-body">
                      {person ? memberName(person, locale) : "—"}
                      {r.note ? ` · ${r.note}` : ""}
                      {placed
                        ? ` · ${t(`placement.${placed.status as "active"}`)}`
                        : ""}
                    </span>
                    {o.kind !== "role" && !placed ? (
                      <Button
                        disabled={give.isPending}
                        onClick={() =>
                          give.mutate({ openingId: o.id, userId: r.user_id })
                        }
                        size="sm"
                        variant="ghost"
                      >
                        {t("give")}
                      </Button>
                    ) : null}
                    {placed?.status === "active" &&
                    o.kind === "apprenticeship" ? (
                      <ConfirmAction
                        confirmLabel={t("complete")}
                        description={t("completeConfirm")}
                        disabled={complete.isPending}
                        onConfirm={() => complete.mutate(placed.id)}
                        variant="ghost"
                      >
                        {t("complete")}
                      </ConfirmAction>
                    ) : null}
                    {placed?.status === "active" ? (
                      <Button
                        disabled={withdraw.isPending}
                        onClick={() => withdraw.mutate(placed.id)}
                        size="sm"
                        variant="ghost"
                      >
                        {t("withdraw")}
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {o.is_open ? (
              <ConfirmAction
                confirmLabel={t("close")}
                description={t("closeConfirm")}
                disabled={close.isPending}
                onConfirm={() => close.mutate({ id: o.id, open: false })}
                variant="ghost"
              >
                {t("close")}
              </ConfirmAction>
            ) : (
              <Button
                className="justify-self-start"
                disabled={close.isPending}
                onClick={() => close.mutate({ id: o.id, open: true })}
                size="sm"
                variant="ghost"
              >
                {t("reopen")}
              </Button>
            )}
          </li>
        ))}
      </ul>
      <ErrorLine
        error={close.error ?? give.error ?? withdraw.error ?? complete.error}
      />
    </div>
  );
};
