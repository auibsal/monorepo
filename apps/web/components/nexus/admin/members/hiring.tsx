"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { type Grant, hasPermission } from "@repo/rbac";
import { localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useGrants } from "@/lib/nexus/queries";
import { useProgrammeOptions } from "../events/data";
import {
  AdminHeading,
  BilingualField,
  DateTimeField,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";
import { useMemberNames } from "../member-picker";
import { SkillsPicker } from "../programmes/callboard";
import { memberName } from "./directory";

const key = ["admin", "hiring"];

export const owners = [
  "program",
  "qirtas",
  "media",
  "partnerships",
  "membership",
  "council",
] as const;
type Owner = (typeof owners)[number];

type Status =
  | "new"
  | "talking"
  | "picked"
  | "not_picked"
  | "offered"
  | "onboarded"
  | "withdrawn";

/** Mirrors private.picks_opening: who picks the person for an opening. */
const picks = (
  grants: readonly Grant[] | undefined,
  owner: string,
  programmeId: string | null
) => {
  switch (owner) {
    case "program":
      return programmeId
        ? hasPermission(grants, "programmes.manage", "programme", programmeId)
        : hasPermission(grants, "programmes.manage");
    case "qirtas":
      return hasPermission(grants, "journal.manage");
    case "media":
      return hasPermission(grants, "content.manage");
    case "partnerships":
      return hasPermission(grants, "partners.manage");
    case "membership":
      return hasPermission(grants, "members.manage");
    case "council":
      return hasPermission(grants, "governance.manage");
    default:
      return false;
  }
};

interface Reply {
  created_at: string;
  note: string | null;
  opening_id: string;
  status: Status;
  talk_at: string | null;
  user_id: string;
}

/** One application and the next steps open to whoever is looking. */
const Application = ({
  canPick,
  name,
  reply,
  runs,
}: {
  readonly canPick: boolean;
  readonly name: string;
  readonly reply: Reply;
  readonly runs: boolean;
}) => {
  const t = useTranslations("nexus.admin.hiring");
  const locale = useLocale() as Locale;
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const [talkAt, setTalkAt] = useState<string | null>(reply.talk_at);
  const move = useMutation({
    mutationFn: async (change: { status: Status; talk_at?: string | null }) =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("opening_replies")
          .update(change)
          .eq("opening_id", reply.opening_id)
          .eq("user_id", reply.user_id)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const own = reply.user_id === user?.id;
  const open = reply.status === "new" || reply.status === "talking";
  const step = (
    status: "picked" | "not_picked" | "offered" | "onboarded" | "withdrawn"
  ) => (
    <Button
      disabled={move.isPending}
      key={status}
      onClick={() => move.mutate({ status })}
      size="sm"
      variant="ghost"
    >
      {t(`steps.${status}`)}
    </Button>
  );

  return (
    <li className="grid gap-2 border-line border-t py-3">
      <p className="type-body">
        {name}
        {reply.note ? ` · ${reply.note}` : ""}
      </p>
      <p className="type-caption">
        {t(`status.${reply.status}`)}
        {reply.talk_at
          ? ` · ${t("talkOn", {
              date: formatLongDate(reply.talk_at, locale),
              time: formatClock(reply.talk_at, locale),
            })}`
          : ""}
      </p>
      {own ? null : (
        <div className="flex flex-wrap items-end gap-2">
          {runs && open ? (
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                move.mutate({ status: "talking", talk_at: talkAt });
              }}
            >
              <DateTimeField
                label={t("talkAt")}
                onChange={setTalkAt}
                required
                value={talkAt}
              />
              <Button disabled={move.isPending} size="sm" type="submit">
                {t("schedule")}
              </Button>
            </form>
          ) : null}
          {canPick && open ? [step("picked"), step("not_picked")] : null}
          {runs && reply.status === "picked" ? step("offered") : null}
          {runs && reply.status === "offered" ? step("onboarded") : null}
          {runs && reply.status !== "onboarded" && reply.status !== "withdrawn"
            ? step("withdrawn")
            : null}
        </div>
      )}
      <ErrorLine error={move.error} />
    </li>
  );
};

/** Membership posts a role for any owner; owners post their own. */
const NewRole = () => {
  const t = useTranslations("nexus.admin.hiring");
  const { supabase } = useAuth();
  const grants = useGrants();
  const queryClient = useQueryClient();
  const programs = useProgrammeOptions("programmes.manage");
  const blank = {
    body: { ar: "", en: "" },
    closes_at: null as string | null,
    owner: "program" as Owner,
    programme_id: "",
    skills: [] as Parameters<typeof SkillsPicker>[0]["value"][number][],
    title: { ar: "", en: "" },
  };
  const [form, setForm] = useState(blank);
  const runs = hasPermission(grants.data, "members.manage");
  const choices = owners.filter(
    (owner) => runs || picks(grants.data, owner, null) || owner === "program"
  );
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
            kind: "role",
            owner: form.owner,
            programme_id:
              form.owner === "program"
                ? form.programme_id || programs.options[0]?.id || null
                : null,
            skills: form.skills as string[],
            title_ar: form.title.ar,
            title_en: form.title.en,
          })
      ),
    onSuccess: async () => {
      setForm(blank);
      await queryClient.invalidateQueries({ queryKey: key });
    },
  });

  return (
    <form
      className="grid max-w-3xl gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        add.mutate();
      }}
    >
      <h2 className="type-heading">{t("post")}</h2>
      <Field hint={t("ownerHint")} label={t("owner")}>
        {(id) => (
          <SelectInput
            id={id}
            onChange={(e) =>
              setForm((f) => ({ ...f, owner: e.target.value as Owner }))
            }
            value={form.owner}
          >
            {choices.map((owner) => (
              <option key={owner} value={owner}>
                {t(`owners.${owner}`)}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
      {form.owner === "program" ? (
        <Field label={t("program")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({ ...f, programme_id: e.target.value }))
              }
              value={form.programme_id || programs.options[0]?.id || ""}
            >
              {programs.options.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
      ) : null}
      <BilingualField
        label={t("roleTitle")}
        maxLength={200}
        onChange={(title) => setForm((f) => ({ ...f, title }))}
        required
        value={form.title}
      />
      <BilingualField
        label={t("roleBody")}
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
  );
};

/**
 * Hiring (owner, Oct 30, 2026). The Callboard lists every role; Membership
 * runs the process for each (applications, conversations, the offer,
 * onboarding), and the owner of the role picks the person: the Editor the
 * masthead, the Director of Programs the Program Leads, each director
 * their team. RLS shows each person the roles they run or own.
 */
export const HiringAdmin = () => {
  const t = useTranslations("nexus.admin.hiring");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const grants = useGrants();
  const programs = useProgrammeOptions(null);
  const list = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("openings")
          .select(
            "id, owner, programme_id, kind, title_en, title_ar, is_open, closes_at, opening_replies(opening_id, user_id, note, status, talk_at, created_at)"
          )
          .eq("kind", "role")
          .order("created_at", { ascending: false })
      ) ?? [],
    queryKey: key,
  });
  const names = useMemberNames(
    (list.data ?? []).flatMap((o) => o.opening_replies.map((r) => r.user_id))
  );
  const runs = hasPermission(grants.data, "members.manage");

  return (
    <div className="grid gap-10">
      <AdminHeading title={t("title")}>{t("lede")}</AdminHeading>
      <ul className="grid">
        {list.data?.length === 0 ? (
          <li className="type-body text-text-secondary">{t("empty")}</li>
        ) : null}
        {list.data?.map((o) => (
          <li className="grid gap-2 border-line border-t py-space-4" key={o.id}>
            <h2 className="type-subheading">{localized(o, "title", locale)}</h2>
            <p className="type-caption">
              {o.owner === "program"
                ? programs.label(o.programme_id)
                : t(`owners.${o.owner as Owner}`)}
              {" · "}
              {o.is_open ? t("open") : t("closed")}
              {o.closes_at
                ? ` · ${t("closesOn", { date: formatLongDate(o.closes_at, locale) })}`
                : ""}
            </p>
            <ul className="grid">
              {o.opening_replies.map((reply) => {
                const person = names.data?.find((n) => n.id === reply.user_id);
                return (
                  <Application
                    canPick={picks(grants.data, o.owner, o.programme_id)}
                    key={reply.user_id}
                    name={person ? memberName(person, locale) : "—"}
                    reply={reply as Reply}
                    runs={runs}
                  />
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
      <NewRole />
    </div>
  );
};
