"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
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
  BilingualField,
  DateTimeField,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";
import { SkillsPicker } from "../programmes/skills-picker";

/** Every opening list in the Diwan reads and refreshes under this key. */
export const key = ["admin", "openings"];

export const owners = [
  "program",
  "qirtas",
  "media",
  "partnerships",
  "membership",
  "council",
] as const;
export type Owner = (typeof owners)[number];

type Status =
  | "new"
  | "talking"
  | "picked"
  | "not_picked"
  | "offered"
  | "onboarded"
  | "withdrawn";

/** Mirrors private.picks_opening: who picks the person for an opening. */
export const picks = (
  grants: readonly Grant[] | undefined,
  owner: string,
  programmeId: string | null
) => {
  switch (owner) {
    case "program":
      return programmeId
        ? hasPermission(grants, "programs.manage", "programme", programmeId)
        : hasPermission(grants, "programs.manage");
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

export interface Reply {
  created_at: string;
  note: string | null;
  opening_id: string;
  status: Status;
  talk_at: string | null;
  user_id: string;
}

/** One application and the next steps open to whoever is looking. */
export const Application = ({
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

/** The roles Get involved hires for (access.roles.hiring_owner). */
const useHiredRoles = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      (
        unwrap(
          await supabase
            .schema("access")
            .from("roles")
            .select("key, name_en, name_ar, hiring_owner, sort")
            .not("hiring_owner", "is", null)
            .order("sort")
        ) ?? []
      ).map((r) => ({ ...r, owner: r.hiring_owner as Owner })),
    queryKey: [...key, "roles"],
  });
};

/**
 * Posting a role (owner, Oct 31, 2026): the role is chosen from the
 * Society's roles, never typed; it decides who picks the person, and
 * whoever is onboarded holds it. Membership posts any role; owners post
 * their own. A program role names its program and may carry its own title
 * ("Salon Host" for a Program Lead).
 */
export const NewRole = ({ onDone }: { readonly onDone: () => void }) => {
  const t = useTranslations("nexus.admin.hiring");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const grants = useGrants();
  const queryClient = useQueryClient();
  const programs = useProgrammeOptions("programs.manage");
  const roles = useHiredRoles();
  const blank = {
    body: { ar: "", en: "" },
    closes_at: null as string | null,
    programme_id: "",
    role: "",
    skills: [] as Parameters<typeof SkillsPicker>[0]["value"][number][],
    title: { ar: "", en: "" },
  };
  const [form, setForm] = useState(blank);
  const runs = hasPermission(grants.data, "members.manage");
  const choices = (roles.data ?? []).filter(
    (r) => runs || picks(grants.data, r.owner, null) || r.owner === "program"
  );
  const role = choices.find((r) => r.key === form.role) ?? choices[0];
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
            // The role decides the owner (private.opening_role).
            owner: role?.owner ?? "program",
            programme_id:
              role?.owner === "program"
                ? form.programme_id || programs.options[0]?.id || null
                : null,
            role: role?.key ?? null,
            skills: form.skills as string[],
            // Empty: the role's own name.
            title_ar: form.title.ar,
            title_en: form.title.en,
          })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key });
      onDone();
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
      <Field hint={t("roleHint")} label={t("role")}>
        {(id) => (
          <SelectInput
            id={id}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            value={role?.key ?? ""}
          >
            {owners.map((owner) => {
              const group = choices.filter((r) => r.owner === owner);
              return group.length > 0 ? (
                <optgroup key={owner} label={t(`owners.${owner}`)}>
                  {group.map((r) => (
                    <option key={r.key} value={r.key}>
                      {localized(r, "name", locale)}
                    </option>
                  ))}
                </optgroup>
              ) : null;
            })}
          </SelectInput>
        )}
      </Field>
      {role?.owner === "program" ? (
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
        value={form.title}
      />
      <p className="type-caption">{t("roleTitleHint")}</p>
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
      <SaveButton
        disabled={!role}
        pending={add.isPending}
        success={add.isSuccess}
      />
      <ErrorLine error={add.error} />
    </form>
  );
};
