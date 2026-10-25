"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Label } from "@repo/design-system/components/ui/label";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { localized, membership, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import {
  BilingualField,
  ConfirmAction,
  DateTimeField,
  ErrorLine,
  SaveButton,
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

const blank = {
  body: { ar: "", en: "" },
  closes_at: null as string | null,
  skills: [] as Skill[],
  title: { ar: "", en: "" },
};

/**
 * Roles the program needs filled, on the Callboard: post one, see who is
 * interested (each reply is also emailed to the program's managers), and
 * close it once it's filled.
 */
export const Openings = ({ programmeId }: { programmeId: string }) => {
  const t = useTranslations("nexus.admin.programmes.callboard");
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
              "id, title_en, title_ar, skills, closes_at, is_open, opening_replies(user_id, note, created_at)"
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
  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("openings")
          .insert({
            body_ar: form.body.ar || null,
            body_en: form.body.en || null,
            closes_at: form.closes_at,
            programme_id: programmeId,
            skills: form.skills,
            title_ar: form.title.ar,
            title_en: form.title.en,
          })
      ),
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

  const submit = (event: FormEvent) => {
    event.preventDefault();
    add.mutate();
  };

  return (
    <div className="grid gap-8">
      <p className="type-body max-w-3xl text-text-secondary">{t("lede")}</p>
      <form className="grid max-w-3xl gap-4" onSubmit={submit}>
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
              <p className="type-subheading">{localized(o, "title", locale)}</p>
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
                return (
                  <li className="type-body" key={r.user_id}>
                    {person ? memberName(person, locale) : "—"}
                    {r.note ? ` · ${r.note}` : ""}
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
      <ErrorLine error={close.error} />
    </div>
  );
};
