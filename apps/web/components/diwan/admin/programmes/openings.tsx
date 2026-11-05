"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { hasPermission, hasPermissionAnywhere } from "@repo/rbac";
import { journal, localized, type membership, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { DateInput } from "@/components/fields/date-input";
import { Link, useRouter } from "@/lib/diwan/navigation";
import { useGrants } from "@/lib/diwan/queries";
import { useQueryParam } from "@/lib/diwan/use-query-param";
import { SectionSpinner } from "../../states";
import { useProgrammeOptions } from "../events/data";
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
import { PartnerPlaceForm } from "../partners/places";
import { SkillsPicker } from "./skills-picker";

/**
 * What an opening offers (owner, Oct 31, 2026: every open place, inside the
 * Society and out): a role, an Apprenticeship, a First Ink place, a
 * volunteer place, or a place with one of the Society's partners.
 */
export const openingKinds = [
  "role",
  "apprenticeship",
  "first_ink",
  "volunteer",
  "partner",
] as const;
type OpeningKind = (typeof openingKinds)[number];

/** Places held by people over a term, with a rota whose hours count. */
const withRota = (kind: OpeningKind) =>
  kind === "apprenticeship" || kind === "first_ink" || kind === "volunteer";

/** Places that name a partner: the school for First Ink, or the partner. */
const namesPartner = (kind: OpeningKind) =>
  kind === "first_ink" || kind === "partner";

const blank = {
  body: { ar: "", en: "" },
  closes_at: null as string | null,
  desk: "" as journal.Desk | "",
  kind: "role" as OpeningKind,
  partner_id: "",
  places: "",
  skills: [] as (typeof membership.skills)[number][],
  term_from: "",
  term_to: "",
  title: { ar: "", en: "" },
};

/** The row an opening is saved as; places only for the two kinds of place. */
const openingRow = (form: typeof blank, programmeId: string | null) => {
  const place = form.kind !== "role";
  return {
    body_ar: form.body.ar || null,
    body_en: form.body.en || null,
    closes_at: form.closes_at,
    desk: form.kind === "apprenticeship" && form.desk ? form.desk : null,
    kind: form.kind,
    partner_id: namesPartner(form.kind) ? form.partner_id : null,
    places: place && form.places ? Number(form.places) : null,
    programme_id: programmeId,
    skills: form.skills,
    term_from: place && form.term_from ? form.term_from : null,
    term_to: place && form.term_to ? form.term_to : null,
    title_ar: form.title.ar,
    title_en: form.title.en,
  };
};

/** The places a program posts: held over a term, with sessions. */
const placeKinds = ["apprenticeship", "first_ink", "volunteer"] as const;
type PlaceKind = (typeof placeKinds)[number];

/** Every opening the officer can see, with its replies and places. */
const useOpenings = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("openings")
          .select(
            "id, kind, owner, programme_id, partner_id, title_en, title_ar, closes_at, is_open, opening_replies(opening_id, user_id, note, status, talk_at, created_at), placements(id, user_id, status)"
          )
          .order("created_at", { ascending: false })
      ) ?? [],
    queryKey: hiringKey,
  });
};

type OpeningListRow = NonNullable<
  ReturnType<typeof useOpenings>["data"]
>[number];
type MemberNames = NonNullable<ReturnType<typeof useMemberNames>["data"]>;

/** A place's replies: give the place, complete or withdraw it. */
const PlaceReplies = ({
  names,
  opening: o,
}: {
  readonly names: MemberNames;
  readonly opening: OpeningListRow;
}) => {
  const t = useTranslations("diwan.admin.programmes.openings");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: hiringKey });
  const give = useMutation({
    mutationFn: async (userId: string) =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("placements")
          .insert({ opening_id: o.id, user_id: userId })
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
  return (
    <>
      <ul className="grid gap-1">
        {o.opening_replies.map((r) => {
          const person = names.find((n) => n.id === r.user_id);
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
              {placed ? null : (
                <Button
                  disabled={give.isPending}
                  onClick={() => give.mutate(r.user_id)}
                  size="sm"
                  variant="ghost"
                >
                  {t("give")}
                </Button>
              )}
              {placed?.status === "active" && o.kind === "apprenticeship" ? (
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
      <ErrorLine error={give.error ?? withdraw.error ?? complete.error} />
    </>
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
          <Link className="hover:underline" href={`/people/openings/${o.id}`}>
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
                key={reply.user_id}
                name={person ? memberName(person, locale) : "—"}
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
 * Every opening on Get involved in one list (owner, Nov 4, 2026, evening:
 * one place for each thing; was a program's Places, People → Hiring and
 * Partners → Places): roles, Apprenticeships, First Ink, volunteer places
 * and places with partners. Filter by what it offers and by program (a
 * program's page links here with `?program=<slug>`). A role's replies run
 * through hiring (Membership runs it, the role's owner picks); a place's
 * replies are given the place. Each opening is edited at its own address.
 */
export const OpeningsAdmin = () => {
  const t = useTranslations("diwan.admin.programmes.openings");
  const th = useTranslations("diwan.admin.hiring");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const grants = useGrants();
  const programs = useProgrammeOptions(null);
  const programSlug = useQueryParam("program");
  const [kind, setKind] = useState<OpeningKind | "">("");
  const [program, setProgram] = useState<string | null>(null);
  const programId =
    program ?? programs.options.find((p) => p.slug === programSlug)?.id ?? "";
  const list = useOpenings();
  const partnerNames = useQuery({
    queryFn: async () =>
      unwrap(await supabase.schema("governance").rpc("partner_names")) ?? [],
    queryKey: ["admin", "partner-names"],
  });
  const names = useMemberNames(
    (list.data ?? []).flatMap((o) => o.opening_replies.map((r) => r.user_id))
  );
  const runs = hasPermission(grants.data, "members.manage");

  const shown = (list.data ?? []).filter(
    (o) =>
      (kind === "" || o.kind === kind) &&
      (programId === "" || o.programme_id === programId)
  );
  const whose = (o: OpeningListRow) => {
    const partner = (partnerNames.data ?? []).find(
      (p) => p.id === o.partner_id
    );
    const at = partner ? localized(partner, "name", locale) : "";
    if (o.kind === "partner") {
      return at;
    }
    const owner =
      o.owner === "program"
        ? programs.label(o.programme_id)
        : th(`owners.${o.owner as Owner}`);
    return [owner, at].filter(Boolean).join(", ");
  };

  return (
    <div className="grid gap-8">
      <AdminHeading
        actions={<NewLink href="/people/openings/new">{t("new")}</NewLink>}
        title={t("listTitle")}
      >
        {t("listLede")}
      </AdminHeading>
      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
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
        <Field label={th("program")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) => setProgram(e.target.value)}
              value={programId}
            >
              <option value="">{t("allPrograms")}</option>
              {programs.options.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
      </div>
      {list.isPending ? <SectionSpinner /> : null}
      <ul className="grid divide-y divide-line">
        {list.data && shown.length === 0 ? (
          <li className="type-body py-3 text-text-secondary">{t("empty")}</li>
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
 * A place (an Apprenticeship, First Ink or a volunteer place): where it is
 * (a Qirtas section, the Company or an event team; owner, Nov 5, 2026: no
 * series), its term and places. Its sessions are a rota of its own, made
 * with it, so their hours count as service.
 */
const ProgramPlaceForm = ({
  kind,
  onDone,
}: {
  readonly kind: PlaceKind;
  readonly onDone: () => void;
}) => {
  const t = useTranslations("diwan.admin.programmes.openings");
  const th = useTranslations("diwan.admin.hiring");
  const tj = useTranslations("diwan.admin.journal");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const programs = useProgrammeOptions("programs.manage");
  const [form, setForm] = useState({ ...blank, kind });
  // Qirtas's and the Company's rows, or none: an event team.
  const homes = programs.options.filter(
    (p) => p.slug === "waraq" || p.slug === "company"
  );
  const [programme, setProgramme] = useState("");
  const programmeId = programme;
  const partners = useQuery({
    enabled: namesPartner(kind),
    queryFn: async () =>
      unwrap(await supabase.schema("governance").rpc("partner_names")) ?? [],
    queryKey: ["admin", "partner-names"],
  });
  const add = useMutation({
    mutationFn: async () => {
      const opening = unwrap(
        await supabase
          .schema("programmes")
          .from("openings")
          .insert(openingRow({ ...form, kind }, programmeId || null))
          .select("id")
          .single()
      );
      if (opening && withRota(kind)) {
        unwrap(
          await supabase
            .schema("programmes")
            .from("rotas")
            .insert({
              ends_on: form.term_to || null,
              opening_id: opening.id,
              programme_id: programmeId || null,
              starts_on: form.term_from || null,
              title_ar: form.title.ar,
              title_en: form.title.en,
            })
        );
      }
    },
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
      <Field label={th("program")}>
        {(id) => (
          <SelectInput
            id={id}
            onChange={(e) => setProgramme(e.target.value)}
            value={programmeId}
          >
            <option value="">{th("owners.program")}</option>
            {homes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
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
      {kind === "apprenticeship" ? (
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
      {namesPartner(kind) ? (
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
            <DateInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({ ...f, term_from: e.target.value }))
              }
              required={kind === "apprenticeship"}
              value={form.term_from}
            />
          )}
        </Field>
        <Field label={t("termTo")}>
          {(id) => (
            <DateInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({ ...f, term_to: e.target.value }))
              }
              required={kind === "apprenticeship"}
              value={form.term_to}
            />
          )}
        </Field>
      </div>
      <DateTimeField
        label={t("closes")}
        onChange={(closes_at) => setForm((f) => ({ ...f, closes_at }))}
        value={form.closes_at}
      />
      <SaveButton pending={add.isPending} />
      <ErrorLine error={add.error} />
    </form>
  );
};

/**
 * Posting an opening (owner, Nov 4, 2026, evening: one place for every
 * opening): first what it offers, among the kinds this officer posts, then
 * its form. A role is chosen from the Society's roles (hiring); a program's
 * place names its program; a place with a partner is Partnerships'.
 */
export const NewOpeningPage = () => {
  const t = useTranslations("diwan.admin.programmes.openings");
  const grants = useGrants();
  const router = useRouter();
  const done = () => router.push("/people/openings");
  const posts = openingKinds.filter((k) => {
    if (k === "partner") {
      return hasPermissionAnywhere(grants.data, "partners.manage");
    }
    if (k === "role") {
      return true;
    }
    return hasPermissionAnywhere(grants.data, "programs.manage");
  });
  const [chosen, setChosen] = useState<OpeningKind | "">("");
  const kind = chosen || posts[0];
  return (
    <RecordPage back="/people/openings" backLabel={t("back")} title={t("new")}>
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
      {kind === "partner" ? <PartnerPlaceForm onDone={done} /> : null}
      {kind && kind !== "role" && kind !== "partner" ? (
        <ProgramPlaceForm key={kind} kind={kind} onDone={done} />
      ) : null}
    </RecordPage>
  );
};
