"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { localized, programmes, unwrap } from "@/lib/data";
import { Link, useRouter } from "@/lib/diwan/navigation";
import { useGrants } from "@/lib/diwan/queries";
import { hasPermission, hasPermissionAnywhere } from "@/lib/rbac";
import { SectionSpinner } from "../../states";
import {
  AdminHeading,
  BilingualField,
  ConfirmAction,
  DateTimeField,
  ErrorLine,
  Field,
  NewLink,
  RecordPage,
  SaveButton,
  SelectInput,
} from "../kit";
import { useMemberNames } from "../member-picker";
import { memberName } from "../members/directory";
import {
  Application,
  key as hiringKey,
  NewRole,
  type Owner,
  picks,
  type Reply,
} from "../members/hiring";

/**
 * What an opening offers (decisions.md: open roles only): a team role
 * (hiring), a place on one event's team, or a Qalam mentor's place.
 * Auditions come from the Company's productions; volunteer shifts are on
 * each event.
 */
export const openingKinds = ["role", "event_team", "qalam_mentor"] as const;

/** The appointed director seats (decisions §4). */
const DIRECTOR_ROLES = new Set([
  "artistic_director",
  "events_director",
  "partnerships_director",
  "membership_director",
  "media_director",
]);
type OpeningKind = (typeof openingKinds)[number];
type PlaceKind = Exclude<OpeningKind, "role">;

const blank = {
  body: { ar: "", en: "" },
  closes_at: null as string | null,
  event_id: "",
  places: "",
  title: { ar: "", en: "" },
};

/** Every opening the officer can see, with its replies. */
const useOpenings = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("openings")
          .select(
            "id, kind, owner, role, programme_id, event_id, title_en, title_ar, closes_at, is_open, questions, opening_replies(opening_id, user_id, note, status, talk_at, created_at, answers, availability, files, accommodation, lang, gpa_consent_at, submitted_at, offer_expires_at, student_life_eligible_at)"
          )
          .order("created_at", { ascending: false })
      ) ?? [],
    queryKey: hiringKey,
  });
};

/** Events coming up, to post an event team for. */
const useComingEvents = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .from("events")
          .select("id, slug, title_en, title_ar, starts_at")
          .gte("starts_at", new Date().toISOString())
          .order("starts_at")
      ) ?? [],
    queryKey: ["admin", "coming-events"],
  });
};

type OpeningListRow = NonNullable<
  ReturnType<typeof useOpenings>["data"]
>[number];
type MemberNames = NonNullable<ReturnType<typeof useMemberNames>["data"]>;

/** A place's replies: who said they're interested, with their note. */
const PlaceReplies = ({
  names,
  opening: o,
}: {
  readonly names: MemberNames;
  readonly opening: OpeningListRow;
}) => {
  const locale = useLocale() as Locale;
  return (
    <ul className="grid gap-1">
      {o.opening_replies.map((r) => {
        const person = names.find((n) => n.id === r.user_id);
        return (
          <li className="type-body" key={r.user_id}>
            {person ? memberName(person, locale) : "—"}
            {r.note ? ` · ${r.note}` : ""}
          </li>
        );
      })}
    </ul>
  );
};

/** One opening on the list: what it is, its replies, open or closed. */
const OpeningItem = ({
  canPick,
  names,
  opening: o,
  runs,
  whose,
}: {
  readonly canPick: boolean;
  readonly names: MemberNames;
  readonly opening: OpeningListRow;
  readonly runs: boolean;
  readonly whose: string;
}) => {
  const t = useTranslations("diwan.admin.programmes.openings");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const toggle = useMutation({
    mutationFn: async (open: boolean) =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("openings")
          .update({ is_open: open })
          .eq("id", o.id)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hiringKey }),
  });
  return (
    <li className="grid gap-2 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="type-subheading">
          <Link
            className="hover:underline"
            href={`/membership/openings/${o.id}`}
          >
            {localized(o, "title", locale)}
          </Link>
        </p>
        <p className="type-caption">
          {o.is_open ? t("open") : t("closed")}
          {o.closes_at
            ? ` · ${t("closesOn", { date: formatLongDate(o.closes_at, locale) })}`
            : ""}
        </p>
      </div>
      <p className="type-caption">
        {[
          t(`kinds.${o.kind as OpeningKind}`),
          whose,
          t("replies", { count: o.opening_replies.length }),
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {o.kind === "role" ? (
        <ul className="grid">
          {o.opening_replies.map((reply) => {
            const person = names.find((n) => n.id === reply.user_id);
            return (
              <Application
                canPick={canPick}
                director={DIRECTOR_ROLES.has(o.role ?? "")}
                key={reply.user_id}
                name={person ? memberName(person, locale) : "—"}
                questions={programmes.questionsOf(o.questions)}
                reply={reply as Reply}
                runs={runs}
              />
            );
          })}
        </ul>
      ) : (
        <PlaceReplies names={names} opening={o} />
      )}
      {o.is_open ? (
        <div className="justify-self-start">
          <ConfirmAction
            confirmLabel={t("close")}
            description={t("closeConfirm")}
            disabled={toggle.isPending}
            onConfirm={() => toggle.mutate(false)}
            variant="ghost"
          >
            {t("close")}
          </ConfirmAction>
        </div>
      ) : (
        <Button
          className="justify-self-start"
          disabled={toggle.isPending}
          onClick={() => toggle.mutate(true)}
          size="sm"
          variant="ghost"
        >
          {t("reopen")}
        </Button>
      )}
      <ErrorLine error={toggle.error} />
    </li>
  );
};

/**
 * Every opening on Get involved in one list (decisions.md: open roles
 * only): team roles, event teams and Qalam mentors, filtered by kind. A
 * role's replies run through hiring (Membership runs it, the role's owner
 * picks); an event team's or a mentor's replies are read here. Each opening
 * is edited at its own address.
 */
export const OpeningsAdmin = () => {
  const t = useTranslations("diwan.admin.programmes.openings");
  const th = useTranslations("diwan.admin.hiring");
  const locale = useLocale() as Locale;
  const grants = useGrants();
  const [kind, setKind] = useState<OpeningKind | "">("");
  const list = useOpenings();
  const events = useComingEvents();
  const names = useMemberNames(
    (list.data ?? []).flatMap((o) => o.opening_replies.map((r) => r.user_id))
  );
  const runs = hasPermission(grants.data, "members.manage");
  const shown = (list.data ?? []).filter((o) => kind === "" || o.kind === kind);
  const whose = (o: OpeningListRow) => {
    if (o.kind === "event_team") {
      const event = (events.data ?? []).find((e) => e.id === o.event_id);
      return event ? localized(event, "title", locale) : "";
    }
    return o.kind === "role" ? th(`owners.${o.owner as Owner}`) : "";
  };

  return (
    <div className="grid gap-8">
      <AdminHeading
        actions={<NewLink href="/membership/openings/new">{t("new")}</NewLink>}
        title={t("listTitle")}
      >
        {t("listLede")}
      </AdminHeading>
      <div className="max-w-md">
        <Field label={t("kind")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) => setKind(e.target.value as OpeningKind | "")}
              value={kind}
            >
              <option value="">{t("allKinds")}</option>
              {openingKinds.map((k) => (
                <option key={k} value={k}>
                  {t(`kinds.${k}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
      </div>
      {list.isPending ? <SectionSpinner /> : null}
      <ul className="divide-line grid divide-y">
        {list.data && shown.length === 0 ? (
          <li className="type-body text-text-secondary py-3">{t("empty")}</li>
        ) : null}
        {shown.map((o) => (
          <OpeningItem
            canPick={picks(grants.data, o.owner, o.programme_id)}
            key={o.id}
            names={names.data ?? []}
            opening={o}
            runs={runs}
            whose={whose(o)}
          />
        ))}
      </ul>
    </div>
  );
};

/**
 * A place: on one event's team (the President or the event's lead posts it)
 * or as a Qalam mentor (the Editor-in-Chief's team), with its places.
 */
const PlaceForm = ({
  kind,
  onDone,
}: {
  readonly kind: PlaceKind;
  readonly onDone: () => void;
}) => {
  const t = useTranslations("diwan.admin.programmes.openings");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const events = useComingEvents();
  const [form, setForm] = useState(blank);
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
            event_id: kind === "event_team" ? form.event_id : null,
            kind,
            owner: kind === "event_team" ? "program" : "qirtas",
            places: form.places ? Number(form.places) : null,
            title_ar: form.title.ar,
            title_en: form.title.en,
          })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hiringKey });
      onDone();
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    add.mutate();
  };

  return (
    <form className="grid max-w-3xl gap-4" onSubmit={submit}>
      {kind === "event_team" ? (
        <Field label={t("event")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({ ...f, event_id: e.target.value }))
              }
              required
              value={form.event_id}
            >
              <option value="">{t("chooseEvent")}</option>
              {(events.data ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {`${localized(e, "title", locale)} · ${formatLongDate(e.starts_at, locale)}`}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
      ) : null}
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
      <Field label={t("places")}>
        {(id) => (
          <Input
            className="max-w-xs"
            dir="ltr"
            id={id}
            max={100}
            min={1}
            onChange={(e) => setForm((f) => ({ ...f, places: e.target.value }))}
            type="number"
            value={form.places}
          />
        )}
      </Field>
      <DateTimeField
        label={t("closes")}
        onChange={(closes_at) => setForm((f) => ({ ...f, closes_at }))}
        value={form.closes_at}
      />
      <SaveButton
        disabled={kind === "event_team" && !form.event_id}
        pending={add.isPending}
      />
      <ErrorLine error={add.error} />
    </form>
  );
};

/**
 * Posting an opening: first what it offers, among the kinds this officer
 * posts, then its form. A role is chosen from the Society's roles (hiring).
 */
export const NewOpeningPage = () => {
  const t = useTranslations("diwan.admin.programmes.openings");
  const grants = useGrants();
  const router = useRouter();
  const done = () => router.push("/membership/openings");
  const posts = openingKinds.filter((k) => {
    if (k === "event_team") {
      return hasPermissionAnywhere(grants.data, "programs.manage");
    }
    if (k === "qalam_mentor") {
      return hasPermissionAnywhere(grants.data, "qalam.manage");
    }
    return true;
  });
  const [chosen, setChosen] = useState<OpeningKind | "">("");
  const kind = chosen || posts[0];
  return (
    <RecordPage
      back="/membership/openings"
      backLabel={t("back")}
      title={t("new")}
    >
      <Field hint={kind ? t(`kindHints.${kind}`) : undefined} label={t("kind")}>
        {(id) => (
          <SelectInput
            id={id}
            onChange={(e) => setChosen(e.target.value as OpeningKind)}
            value={kind ?? ""}
          >
            {posts.map((k) => (
              <option key={k} value={k}>
                {t(`kinds.${k}`)}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
      {kind === "role" ? <NewRole onDone={done} /> : null}
      {kind && kind !== "role" ? (
        <PlaceForm key={kind} kind={kind} onDone={done} />
      ) : null}
    </RecordPage>
  );
};
