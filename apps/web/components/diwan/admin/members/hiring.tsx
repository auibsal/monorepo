"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import type { Locale } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { localized, type programmes, unwrap } from "@/lib/data";
import { useGrants } from "@/lib/diwan/queries";
import { type Grant, hasPermission } from "@/lib/rbac";
import { useProgrammeOptions } from "../events/data";
import {
  BilingualField,
  DateTimeField,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";
import { useMemberNames } from "../member-picker";

/** Every opening list in the Diwan reads and refreshes under this key. */
export const key = ["admin", "openings"];

const owners = [
  "program",
  "qirtas",
  "media",
  "partnerships",
  "membership",
  "council",
] as const;
export type Owner = (typeof owners)[number];

type Status = programmes.ApplicationStatus;

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
  accommodation?: string | null;
  answers?: unknown;
  availability?: string | null;
  created_at: string;
  files?: string[] | null;
  gpa_consent_at?: string | null;
  lang?: string | null;
  note: string | null;
  offer_expires_at?: string | null;
  opening_id: string;
  status: Status;
  student_life_eligible_at?: string | null;
  submitted_at?: string | null;
  talk_at: string | null;
  user_id: string;
}

/**
 * One application and the next steps open to whoever is looking
 * (decisions §17): the answers; each reviewer's reading (the hiring seat
 * and the second reviewer, either of whom may recuse); interviews,
 * scheduled and recorded on F-02; the shortlist and the offer; and for a
 * director seat, Student Life's answer and the appointment.
 */
export const Application = ({
  canPick,
  director,
  name,
  questions,
  reply,
  runs,
}: {
  readonly canPick: boolean;
  readonly director?: boolean;
  readonly name: string;
  readonly questions?: readonly programmes.Question[];
  readonly reply: Reply;
  readonly runs: boolean;
}) => {
  const t = useTranslations("diwan.admin.hiring");
  const locale = useLocale() as Locale;
  const { user } = useAuth();
  const own = reply.user_id === user?.id;

  return (
    <li className="border-line grid gap-3 border-t py-4">
      <p className="type-body font-medium">{name}</p>
      <p className="type-caption">
        {t(`status.${reply.status}`)}
        {reply.talk_at
          ? ` · ${t("talkOn", {
              date: formatLongDate(reply.talk_at, locale),
              time: formatClock(reply.talk_at, locale),
            })}`
          : ""}
        {reply.lang
          ? ` · ${t(`lang.${reply.lang === "ar" ? "ar" : "en"}`)}`
          : ""}
      </p>
      <ApplicationDetails
        director={director}
        questions={questions}
        reply={reply}
      />
      {own ? null : <Reviews reply={reply} />}
      {own ? null : <Interviews reply={reply} />}
      {own ? null : <Steps canPick={canPick} reply={reply} runs={runs} />}
      {director && reply.status === "accepted" ? (
        <DirectorSteps reply={reply} runs={runs} />
      ) : null}
    </li>
  );
};

/** Moving an application along: the interview, the shortlist, the offer. */
const Steps = ({
  canPick,
  reply,
  runs,
}: {
  readonly canPick: boolean;
  readonly reply: Reply;
  readonly runs: boolean;
}) => {
  const t = useTranslations("diwan.admin.hiring");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [talkAt, setTalkAt] = useState<string | null>(reply.talk_at);
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
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
    onSuccess: refresh,
  });
  const open = reply.status === "new" || reply.status === "talking";
  const step = (status: "picked" | "not_picked" | "offered") => (
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
    <>
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
        {canPick && (open || reply.status === "picked")
          ? [
              reply.status === "picked" ? null : step("picked"),
              step("not_picked"),
            ]
          : null}
        {runs && reply.status === "picked" ? step("offered") : null}
      </div>
      <ErrorLine error={move.error} />
    </>
  );
};

/** What the applicant sent (decisions §17). */
const ApplicationDetails = ({
  director,
  questions,
  reply,
}: {
  readonly director?: boolean;
  readonly questions?: readonly programmes.Question[];
  readonly reply: Reply;
}) => {
  const t = useTranslations("diwan.admin.hiring");
  const locale = useLocale() as Locale;
  const answers = (reply.answers ?? {}) as Record<string, string>;
  return (
    <dl className="grid gap-2">
      {(questions ?? []).map((q) =>
        answers[q.key] ? (
          <div className="grid gap-1" key={q.key}>
            <dt className="type-caption">{locale === "ar" ? q.ar : q.en}</dt>
            <dd className="type-body whitespace-pre-line">{answers[q.key]}</dd>
          </div>
        ) : null
      )}
      {reply.availability ? (
        <div className="grid gap-1">
          <dt className="type-caption">{t("availability")}</dt>
          <dd className="type-body whitespace-pre-line">
            {reply.availability}
          </dd>
        </div>
      ) : null}
      {(reply.files ?? []).length > 0 ? (
        <div className="grid gap-1">
          <dt className="type-caption">{t("links")}</dt>
          <dd className="grid gap-1" dir="ltr">
            {(reply.files ?? []).map((href) => (
              <a
                className="link break-all"
                href={href}
                key={href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {href}
              </a>
            ))}
          </dd>
        </div>
      ) : null}
      {reply.accommodation ? (
        <div className="grid gap-1">
          <dt className="type-caption">{t("accommodation")}</dt>
          <dd className="type-body whitespace-pre-line">
            {reply.accommodation}
          </dd>
        </div>
      ) : null}
      {director && reply.gpa_consent_at ? (
        <div className="grid gap-1">
          <dt className="type-caption">{t("gpaConsent")}</dt>
          <dd className="type-body">
            {formatLongDate(reply.gpa_consent_at, locale)}
          </dd>
        </div>
      ) : null}
    </dl>
  );
};

/**
 * A director seat after acceptance (decisions §4): Student Life's
 * "eligible", then the President appoints under the Board's resolution.
 */
const DirectorSteps = ({
  reply,
  runs,
}: {
  readonly reply: Reply;
  readonly runs: boolean;
}) => {
  const t = useTranslations("diwan.admin.hiring");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const grants = useGrants();
  const queryClient = useQueryClient();
  const [resolution, setResolution] = useState("");
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const studentLife = useMutation({
    mutationFn: async (eligible: boolean) =>
      unwrap(
        await supabase.schema("programmes").rpc("record_student_life_answer", {
          eligible,
          opening_id: reply.opening_id,
          user_id: reply.user_id,
        })
      ),
    onSuccess: refresh,
  });
  const appoint = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("programmes").rpc("appoint_director", {
          opening_id: reply.opening_id,
          resolution,
          user_id: reply.user_id,
        })
      ),
    onSuccess: refresh,
  });
  const president =
    hasPermission(grants.data, "roles.assign") &&
    hasPermission(grants.data, "governance.manage");
  return (
    <>
      {runs ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="type-caption">
            {reply.student_life_eligible_at
              ? t("eligibleOn", {
                  date: formatLongDate(reply.student_life_eligible_at, locale),
                })
              : t("eligibleWaiting")}
          </p>
          {reply.student_life_eligible_at ? null : (
            <Button
              disabled={studentLife.isPending}
              onClick={() => studentLife.mutate(true)}
              size="sm"
              variant="ghost"
            >
              {t("markEligible")}
            </Button>
          )}
        </div>
      ) : null}
      {president && reply.student_life_eligible_at ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            appoint.mutate();
          }}
        >
          <Field label={t("resolution")}>
            {(id) => (
              <Input
                dir="ltr"
                id={id}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="R-2026-01"
                value={resolution}
              />
            )}
          </Field>
          <Button
            disabled={!resolution.trim() || appoint.isPending}
            size="sm"
            type="submit"
          >
            {t("appoint")}
          </Button>
        </form>
      ) : null}
      <ErrorLine error={studentLife.error ?? appoint.error} />
    </>
  );
};

/** Each reviewer's score and notes, or their recusal (decisions §17). */
const Reviews = ({ reply }: { readonly reply: Reply }) => {
  const t = useTranslations("diwan.admin.hiring");
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const reviewKey = [...key, "reviews", reply.opening_id, reply.user_id];
  const reviews = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("application_reviews")
          .select("reviewer, recused, score, notes")
          .eq("opening_id", reply.opening_id)
          .eq("applicant", reply.user_id)
      ) ?? [],
    queryKey: reviewKey,
  });
  const names = useMemberNames((reviews.data ?? []).map((r) => r.reviewer));
  const mine = reviews.data?.find((r) => r.reviewer === user?.id);
  const [form, setForm] = useState({ notes: "", score: "" });
  const save = useMutation({
    mutationFn: async (recused: boolean) =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("application_reviews")
          .upsert({
            applicant: reply.user_id,
            notes: recused ? null : form.notes.trim() || null,
            opening_id: reply.opening_id,
            recused,
            reviewer: user?.id ?? "",
            score: recused || !form.score ? null : Number(form.score),
          })
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reviewKey }),
  });
  return (
    <div className="grid gap-2">
      <p className="type-label">{t("reviews")}</p>
      {(reviews.data ?? []).map((r) => (
        <p className="type-caption" key={r.reviewer}>
          {names.data?.find((p) => p.id === r.reviewer)?.full_name_en ?? ""}
          {" · "}
          {r.recused
            ? t("recused")
            : [r.score ? t("score", { n: String(r.score) }) : null, r.notes]
                .filter(Boolean)
                .join(" · ")}
        </p>
      ))}
      {mine ? null : (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate(false);
          }}
        >
          <Field label={t("scoreLabel")}>
            {(id) => (
              <Input
                className="w-20"
                dir="ltr"
                id={id}
                max={5}
                min={1}
                onChange={(e) =>
                  setForm((f) => ({ ...f, score: e.target.value }))
                }
                type="number"
                value={form.score}
              />
            )}
          </Field>
          <Field label={t("notes")}>
            {(id) => (
              <Input
                id={id}
                maxLength={2000}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                value={form.notes}
              />
            )}
          </Field>
          <Button disabled={save.isPending} size="sm" type="submit">
            {t("saveReview")}
          </Button>
          <Button
            disabled={save.isPending}
            onClick={() => save.mutate(true)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {t("recuse")}
          </Button>
        </form>
      )}
      <ErrorLine error={save.error} />
    </div>
  );
};

/** F-02, the interview score sheet: kept in the Diwan (decisions §10). */
const Interviews = ({ reply }: { readonly reply: Reply }) => {
  const t = useTranslations("diwan.admin.hiring");
  const locale = useLocale() as Locale;
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const recordKey = [...key, "interviews", reply.opening_id, reply.user_id];
  const records = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("interview_records")
          .select("id, interviewer, held_at, notes, recommendation")
          .eq("opening_id", reply.opening_id)
          .eq("applicant", reply.user_id)
          .order("held_at")
      ) ?? [],
    queryKey: recordKey,
  });
  const [form, setForm] = useState({ notes: "", recommendation: "appoint" });
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("interview_records")
          .insert({
            applicant: reply.user_id,
            interviewer: user?.id ?? "",
            notes: form.notes.trim() || null,
            opening_id: reply.opening_id,
            recommendation: form.recommendation,
          })
      ),
    onSuccess: async () => {
      setForm({ notes: "", recommendation: "appoint" });
      await queryClient.invalidateQueries({ queryKey: recordKey });
    },
  });
  if (!(reply.talk_at || (records.data ?? []).length > 0)) {
    return null;
  }
  return (
    <div className="grid gap-2">
      <p className="type-label">{t("interviews")}</p>
      {(records.data ?? []).map((r) => (
        <p className="type-caption" key={r.id}>
          {[
            formatLongDate(r.held_at, locale),
            r.recommendation
              ? t(`recommendations.${r.recommendation}` as never)
              : null,
            r.notes,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ))}
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          add.mutate();
        }}
      >
        <Field label={t("recommendation")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({ ...f, recommendation: e.target.value }))
              }
              value={form.recommendation}
            >
              {(["appoint", "second_choice", "not_now"] as const).map((r) => (
                <option key={r} value={r}>
                  {t(`recommendations.${r}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={t("notes")}>
          {(id) => (
            <Input
              id={id}
              maxLength={4000}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              value={form.notes}
            />
          )}
        </Field>
        <Button disabled={add.isPending} size="sm" type="submit">
          {t("recordInterview")}
        </Button>
      </form>
      <ErrorLine error={add.error} />
    </div>
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
 * Posting a role (decisions.md): the role is chosen from the
 * Society's roles, never typed; it decides who picks the person, and
 * whoever is onboarded holds it. Membership posts any role; owners post
 * their own. A program role names its program and may carry its own title
 * ("Salon Host" for an event lead).
 */
export const NewRole = ({ onDone }: { readonly onDone: () => void }) => {
  const t = useTranslations("diwan.admin.hiring");
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
