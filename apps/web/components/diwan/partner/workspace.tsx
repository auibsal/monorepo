"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import { cn } from "@repo/brand/lib/utils";
import type { Locale } from "@repo/internationalization";
import {
  formatDateTime,
  formatLongDate,
} from "@repo/internationalization/format";
import { Link, usePathname } from "@repo/internationalization/navigation";
import { localized, partners, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useState } from "react";
import { Signature } from "@/components/signature";
import { type MyPartner, useMyPartners } from "@/lib/diwan/partners";
import {
  type InviteeLanguage,
  InviteeLanguageField,
} from "../admin/invitee-language";
import {
  BilingualField,
  ConfirmAction,
  ErrorLine,
  Field,
  SaveButton,
} from "../admin/kit";
import { JointChecklist } from "../joint/checklist";
import { DiwanPage, DiwanSection, RowList } from "../page";
import { OnTheSite } from "../site-links";
import { ErrorState, SectionSpinner } from "../states";

const KEY = ["partner-desk"] as const;

const TABS = [
  { href: "/partners/dashboard", key: "profile" },
  { href: "/partners/dashboard/events", key: "events" },
  { href: "/partners/dashboard/people", key: "people" },
] as const;

/**
 * The partner's dashboard (decisions.md: one fixed address,
 * /partners/dashboard): its title and its tabs, Profile, Events (A41)
 * and People.
 * Someone on two partners' teams keeps the first.
 */
const PartnerFrame = ({
  children,
}: {
  children: (partner: MyPartner) => ReactNode;
}) => {
  const t = useTranslations("diwan.partnerDesk");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const mine = useMyPartners();
  if (mine.isPending) {
    return <SectionSpinner />;
  }
  if (mine.isError) {
    return <ErrorState onRetry={() => mine.refetch()} />;
  }
  const [partner] = mine.data;
  if (!partner) {
    return <p className="type-body">{t("none")}</p>;
  }
  return (
    <DiwanPage
      actions={partner.is_listed ? <OnTheSite href="/partners" /> : null}
      lede={t("lede")}
      title={localized(partner, "name", locale)}
    >
      <nav
        aria-label={t("tabsLabel")}
        className="border-line overflow-x-auto border-b"
      >
        <ul className="flex gap-x-6">
          {TABS.map((tab) => {
            const here = pathname === tab.href;
            return (
              <li className="shrink-0" key={tab.href}>
                <Link
                  aria-current={here ? "page" : undefined}
                  className={cn(
                    "hover:text-accent block border-b-[1.5px] py-3 text-sm font-medium whitespace-nowrap",
                    here
                      ? "border-accent text-text"
                      : "text-text-secondary border-transparent"
                  )}
                  href={tab.href}
                >
                  {t(`tabs.${tab.key}`)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {children(partner)}
    </DiwanPage>
  );
};

// ── Profile and memorandum ──────────────────────────────────────────────────

interface PartnerRow {
  description_ar: string | null;
  description_en: string | null;
  id: string;
  name_ar: string | null;
  name_en: string;
  url: string | null;
}

interface AgreementRow {
  asked_grants: string[] | null;
  grants: string[];
  id: string;
  partner_signatory: string | null;
  partner_will: string | null;
  purpose_en: string;
  sal_will: string | null;
  signed_at: string | null;
  society_signatory: string | null;
  status: string;
}

/**
 * A signatory is kept as "English name · Arabic name": each page shows
 * the name in its own language (one language per page).
 */
const inLanguage = (signatory: string, locale: Locale) => {
  const [en, ar] = signatory.split(" · ");
  return (locale === "ar" ? ar || en : en || ar) ?? signatory;
};

const ProfileForm = ({ row }: { row: PartnerRow }) => {
  const t = useTranslations("diwan.partnerDesk.profile");
  const tr = useTranslations("diwan.admin.partners.register");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    description: { ar: row.description_ar ?? "", en: row.description_en ?? "" },
    name: { ar: row.name_ar ?? "", en: row.name_en },
    url: row.url ?? "",
  });
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("partners")
          .update({
            description_ar: form.description.ar.trim() || null,
            description_en: form.description.en.trim() || null,
            name_ar: form.name.ar.trim() || null,
            name_en: form.name.en.trim(),
            url: form.url.trim() || null,
          })
          .eq("id", row.id)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
  const set = (key: "url") => (event: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: event.target.value }));
  return (
    <form
      className="grid gap-6"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <BilingualField
        label={tr("name")}
        maxLength={200}
        onChange={(name) => setForm((f) => ({ ...f, name }))}
        value={form.name}
      />
      <Field label={tr("url")}>
        {(id) => (
          <Input
            dir="ltr"
            id={id}
            onChange={set("url")}
            pattern="https://.*"
            type="url"
            value={form.url}
          />
        )}
      </Field>
      <BilingualField
        label={tr("description")}
        maxLength={1000}
        multiline
        onChange={(description) => setForm((f) => ({ ...f, description }))}
        value={form.description}
      />
      <p className="type-caption">{t("listing")}</p>
      <SaveButton pending={save.isPending} success={save.isSuccess} />
      <ErrorLine error={save.error} />
    </form>
  );
};

const Memoranda = ({ partnerId }: { partnerId: string }) => {
  const t = useTranslations("diwan.partnerDesk.memorandum");
  const tg = useTranslations("diwan.admin.partners.agreements.grants");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const agreements = useQuery({
    queryFn: async () =>
      (unwrap(
        await supabase
          .schema("governance")
          .from("partner_agreements")
          .select(
            "id, purpose_en, partner_will, sal_will, grants, asked_grants, status, partner_signatory, society_signatory, signed_at"
          )
          .eq("partner_id", partnerId)
          .order("created_at", { ascending: false })
      ) ?? []) as AgreementRow[],
    queryKey: [...KEY, "agreements", partnerId],
  });
  if (agreements.isPending) {
    return <SectionSpinner />;
  }
  return (
    <RowList>
      {(agreements.data ?? []).map((a) => (
        <li className="grid gap-3 py-5" key={a.id}>
          <p className="type-caption">
            {a.status === "signed" && a.signed_at
              ? t("signedBoth", {
                  date: formatLongDate(a.signed_at, locale, true),
                })
              : t(a.status === "draft" ? "waiting" : "ended")}
          </p>
          <div className="flex flex-wrap gap-x-10 gap-y-4">
            {a.partner_signatory ? (
              <div className="grid gap-1">
                <span className="type-caption">{t("forPartner")}</span>
                <Signature
                  date={a.signed_at ?? undefined}
                  name={inLanguage(a.partner_signatory, locale)}
                />
              </div>
            ) : null}
            {a.society_signatory ? (
              <div className="grid gap-1">
                <span className="type-caption">{t("forSociety")}</span>
                <Signature
                  date={a.signed_at ?? undefined}
                  name={inLanguage(a.society_signatory, locale)}
                />
              </div>
            ) : null}
          </div>
          <dl className="grid gap-3">
            <div>
              <dt className="type-label">{t("purpose")}</dt>
              <dd className="type-body whitespace-pre-line" dir="auto">
                {a.purpose_en}
              </dd>
            </div>
            {a.partner_will ? (
              <div>
                <dt className="type-label">{t("partnerWill")}</dt>
                <dd className="type-body whitespace-pre-line" dir="auto">
                  {a.partner_will}
                </dd>
              </div>
            ) : null}
            {a.sal_will ? (
              <div>
                <dt className="type-label">{t("salWill")}</dt>
                <dd className="type-body whitespace-pre-line" dir="auto">
                  {a.sal_will}
                </dd>
              </div>
            ) : null}
            {a.grants.length > 0 ? (
              <div>
                <dt className="type-label">{t("grants")}</dt>
                <dd className="type-body">
                  {a.grants
                    .map((g) => tg(g as partners.AgreementGrant))
                    .join(", ")}
                </dd>
              </div>
            ) : null}
          </dl>
          {a.status === "signed" ? (
            <AskForGrants agreement={a} partnerId={partnerId} />
          ) : null}
        </li>
      ))}
    </RowList>
  );
};

/** What a partner may ask to turn on; guest editing is the Society's to offer. */
const ASKABLE = partners.agreementGrants.filter((g) => g !== "guest_editing");

/**
 * A partner turns things on for itself and its guests by asking; the
 * Society approves (decisions.md). Leads ask; the database refuses
 * anyone else.
 */
const AskForGrants = ({
  agreement,
  partnerId,
}: {
  agreement: AgreementRow;
  partnerId: string;
}) => {
  const t = useTranslations("diwan.partnerDesk.memorandum");
  const tg = useTranslations("diwan.admin.partners.agreements.grants");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [chosen, setChosen] = useState<string[]>(
    agreement.asked_grants ?? agreement.grants
  );
  const ask = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("governance").rpc("ask_for_grants", {
          agreement_id: agreement.id,
          grants: chosen,
        })
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [...KEY, "agreements", partnerId],
      }),
  });
  const same =
    [...chosen].sort().join() ===
    [...(agreement.asked_grants ?? agreement.grants)].sort().join();
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        ask.mutate();
      }}
    >
      <fieldset className="grid gap-3">
        <legend className="type-label mb-1">{t("ask")}</legend>
        <p className="type-caption">{t("askHint")}</p>
        {ASKABLE.map((grant) => (
          <div className="flex items-center gap-2" key={grant}>
            <Checkbox
              checked={chosen.includes(grant)}
              id={`ask-${agreement.id}-${grant}`}
              onCheckedChange={(checked) =>
                setChosen((c) =>
                  checked === true
                    ? [...c, grant]
                    : c.filter((g) => g !== grant)
                )
              }
            />
            <Label htmlFor={`ask-${agreement.id}-${grant}`}>{tg(grant)}</Label>
          </div>
        ))}
      </fieldset>
      {agreement.asked_grants ? (
        <p className="type-caption">{t("asked")}</p>
      ) : null}
      {same ? null : (
        <Button
          className="justify-self-start"
          disabled={ask.isPending}
          size="sm"
          type="submit"
          variant="outline"
        >
          {t("askButton")}
        </Button>
      )}
      <ErrorLine error={ask.error} />
    </form>
  );
};

/** /partners/dashboard: the partner's profile and its memoranda. */
export const PartnerProfile = () => {
  const t = useTranslations("diwan.partnerDesk");
  return (
    <PartnerFrame>
      {(partner) => (
        <>
          <DiwanSection id="profile" title={t("profile.title")}>
            <ProfileLoader id={partner.id} />
          </DiwanSection>
          <DiwanSection id="memorandum" title={t("memorandum.title")}>
            <Memoranda partnerId={partner.id} />
          </DiwanSection>
        </>
      )}
    </PartnerFrame>
  );
};

const ProfileLoader = ({ id }: { id: string }) => {
  const { supabase } = useAuth();
  const row = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("partners")
          .select("id, name_en, name_ar, url, description_en, description_ar")
          .eq("id", id)
          .single()
      ) as PartnerRow,
    queryKey: [...KEY, "profile", id],
  });
  if (row.isPending) {
    return <SectionSpinner />;
  }
  if (row.isError) {
    return <ErrorState onRetry={() => row.refetch()} />;
  }
  return <ProfileForm row={row.data} />;
};

/**
 * /partners/dashboard/events: the events run with the Society (the design
 * review A41), soonest first, each with the checklist both sides keep; the
 * partner adds and ticks its own items.
 */
export const PartnerEvents = () => (
  <PartnerFrame>{() => <JointEvents />}</PartnerFrame>
);

const JointEvents = () => {
  const t = useTranslations("diwan.joint");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const events = useQuery({
    queryFn: async () =>
      unwrap(await supabase.schema("events").rpc("my_joint_events")) ?? [],
    queryKey: [...KEY, "joint-events"],
  });
  if (events.isPending) {
    return <SectionSpinner />;
  }
  if (events.isError) {
    return <ErrorState onRetry={() => events.refetch()} />;
  }
  if (events.data.length === 0) {
    return <p className="type-body text-text-secondary">{t("noEvents")}</p>;
  }
  return (
    <>
      {events.data.map((event) => (
        <DiwanSection
          id={`event-${event.id}`}
          key={event.id}
          title={localized(event, "title", locale)}
        >
          <p className="type-caption text-text-secondary">
            {formatDateTime(event.starts_at, locale)}
            {localized(event, "venue", locale)
              ? ` · ${localized(event, "venue", locale)}`
              : ""}
            {event.status === "draft" ? ` · ${t("planned")}` : ""}
          </p>
          <JointChecklist eventId={event.id} society={false} />
        </DiwanSection>
      ))}
    </>
  );
};

// ── People: guests and team ─────────────────────────────────────────────────

interface Guest {
  created_at: string;
  email: string;
  full_name_ar: string | null;
  full_name_en: string | null;
  id: string;
  note: string | null;
  status: string;
}

interface Teammate {
  email: string;
  full_name_ar: string | null;
  full_name_en: string | null;
  lead: boolean;
  user_id: string;
}

const personName = (
  p: {
    email: string;
    full_name_ar: string | null;
    full_name_en: string | null;
  },
  locale: Locale
) =>
  (locale === "ar" ? p.full_name_ar || p.full_name_en : p.full_name_en) ||
  p.email;

const Guests = ({ partnerId }: { partnerId: string }) => {
  const t = useTranslations("diwan.partnerDesk.guests");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const guests = useQuery({
    queryFn: async () =>
      (unwrap(
        await supabase
          .schema("governance")
          .rpc("partner_guests", { partner: partnerId })
      ) ?? []) as Guest[],
    queryKey: [...KEY, "guests", partnerId],
  });
  const decide = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "declined" | "ended" | "verified";
    }) =>
      unwrap(
        await supabase
          .schema("governance")
          .from("partner_affiliations")
          .update({ status })
          .eq("id", id)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
  if (guests.isPending) {
    return <SectionSpinner />;
  }
  if (guests.isError) {
    return <ErrorState onRetry={() => guests.refetch()} />;
  }
  if (guests.data.length === 0) {
    return <p className="type-body text-text-secondary">{t("empty")}</p>;
  }
  return (
    <>
      <RowList>
        {guests.data.map((guest) => (
          <li className="grid gap-2 py-5" key={guest.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{personName(guest, locale)}</p>
              <p className="text-sm break-all" dir="ltr">
                {guest.email}
              </p>
            </div>
            {guest.note ? (
              <p className="type-body" dir="auto">
                {guest.note}
              </p>
            ) : null}
            <p className="type-caption">
              {t(`statuses.${guest.status as "pending"}`)} ·{" "}
              {formatLongDate(guest.created_at, locale)}
            </p>
            <div className="flex flex-wrap gap-2">
              {guest.status === "pending" ? (
                <>
                  <Button
                    disabled={decide.isPending}
                    onClick={() =>
                      decide.mutate({ id: guest.id, status: "verified" })
                    }
                    size="sm"
                  >
                    {t("verify")}
                  </Button>
                  <Button
                    disabled={decide.isPending}
                    onClick={() =>
                      decide.mutate({ id: guest.id, status: "declined" })
                    }
                    size="sm"
                    variant="outline"
                  >
                    {t("decline")}
                  </Button>
                </>
              ) : null}
              {guest.status === "verified" ? (
                <ConfirmAction
                  confirmLabel={t("end")}
                  description={t("endConfirm", {
                    name: personName(guest, locale),
                  })}
                  disabled={decide.isPending}
                  onConfirm={() =>
                    decide.mutate({ id: guest.id, status: "ended" })
                  }
                >
                  {t("end")}
                </ConfirmAction>
              ) : null}
            </div>
          </li>
        ))}
      </RowList>
      <ErrorLine error={decide.error} />
    </>
  );
};

interface Invitation {
  code: string;
  created_at: string;
  email: string | null;
  expires_at: string;
  id: string;
  kind: "team" | "guest" | "associate" | "honorary";
}

/** The link an invitation is, on this site (/invite/<code>). */
const inviteUrl = (code: string, locale: string) =>
  `${window.location.origin}${locale === "en" ? "" : `/${locale}`}/invite/${code}`;

/**
 * An email invitation to a named person (decisions §10): to the team (the
 * Lead's) or as the partner's guest. The person gets an email; the link
 * works for that address only, for fourteen days.
 */
const InviteByEmail = ({
  kind,
  partnerId,
}: {
  kind: "team" | "guest";
  partnerId: string | null;
}) => {
  const t = useTranslations("diwan.partnerDesk.invite");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [lang, setLang] = useState<InviteeLanguage>(
    useLocale() === "ar" ? "ar" : "en"
  );
  const invite = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("partner_invitations")
          .insert({ email: email.trim(), kind, lang, partner_id: partnerId })
      ),
    onSuccess: async () => {
      setEmail("");
      await queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
  return (
    <form
      className="grid max-w-xl gap-3"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        invite.mutate();
      }}
    >
      <Field
        hint={kind === "team" ? t("teamHint") : t("guestHint")}
        label={t("email")}
      >
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
      <InviteeLanguageField onChange={setLang} value={lang} />
      <Button
        className="justify-self-start"
        disabled={invite.isPending}
        type="submit"
        variant="outline"
      >
        {kind === "team" ? t("inviteTeam") : t("inviteGuest")}
      </Button>
      {invite.isSuccess ? (
        <p className="type-caption" role="status">
          {t("sent")}
        </p>
      ) : null}
      <ErrorLine error={invite.error} />
    </form>
  );
};

/** Invitations not yet accepted: copy the link again, or withdraw. */
export const OpenInvitations = ({
  kind,
  partnerId,
}: {
  kind: "team" | "guest" | "associate" | "honorary";
  partnerId: string | null;
}) => {
  const t = useTranslations("diwan.partnerDesk.invite");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState<string | null>(null);
  const open = useQuery({
    queryFn: async () => {
      const query = supabase
        .schema("governance")
        .from("partner_invitations")
        .select("id, kind, email, code, created_at, expires_at");
      return (unwrap(
        await (partnerId
          ? query.eq("partner_id", partnerId)
          : query.is("partner_id", null)
        )
          .eq("kind", kind)
          .is("accepted_at", null)
          .is("revoked_at", null)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
      ) ?? []) as Invitation[];
    },
    queryKey: [...KEY, "invitations", partnerId ?? "society", kind],
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
  const copy = async (code: string) => {
    await navigator.clipboard.writeText(inviteUrl(code, locale));
    setCopied(code);
  };
  if (!open.data?.length) {
    return null;
  }
  return (
    <div className="grid gap-2">
      <p className="type-label">{t("open")}</p>
      <RowList>
        {open.data.map((invitation) => (
          <li
            className="flex flex-wrap items-baseline justify-between gap-2 py-3"
            key={invitation.id}
          >
            <span className="grid gap-1">
              <span className="text-sm break-all" dir="ltr">
                {invitation.email}
              </span>
              <span className="type-caption">
                {t("until", {
                  date: formatLongDate(invitation.expires_at, locale),
                })}
              </span>
            </span>
            <span className="flex flex-wrap gap-2">
              <Button
                onClick={() => copy(invitation.code)}
                size="sm"
                type="button"
                variant="outline"
              >
                {copied === invitation.code ? t("copied") : t("copy")}
              </Button>
              <ConfirmAction
                confirmLabel={t("withdraw")}
                description={t("withdrawConfirm")}
                disabled={withdraw.isPending}
                onConfirm={() => withdraw.mutate(invitation.id)}
              >
                {t("withdraw")}
              </ConfirmAction>
            </span>
          </li>
        ))}
      </RowList>
      <ErrorLine error={withdraw.error} />
    </div>
  );
};

/** One person on the team, with what the signed-in person may do. */
const TeamMate = ({
  busy,
  canLeave,
  iLead,
  mate,
  me,
  onLead,
  onRemove,
}: {
  busy: boolean;
  canLeave: boolean;
  iLead: boolean;
  mate: Teammate;
  me: boolean;
  onLead: () => void;
  onRemove: () => void;
}) => {
  const t = useTranslations("diwan.partnerDesk.team");
  const locale = useLocale() as Locale;
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-2 py-4">
      <span className="grid gap-1">
        <span>
          <span className="font-medium">{personName(mate, locale)}</span>{" "}
          <span className="text-text-secondary text-sm break-all" dir="ltr">
            {mate.email}
          </span>
        </span>
        <span className="type-caption">
          {mate.lead ? t("lead") : t("member")}
        </span>
      </span>
      <span className="flex flex-wrap gap-2">
        {iLead && !me ? (
          <Button
            disabled={busy}
            onClick={onLead}
            size="sm"
            type="button"
            variant="outline"
          >
            {mate.lead ? t("makeMember") : t("makeLead")}
          </Button>
        ) : null}
        {(iLead || me) && canLeave ? (
          <ConfirmAction
            confirmLabel={me ? t("leave") : t("remove")}
            description={
              me
                ? t("leaveConfirm")
                : t("removeConfirm", { name: personName(mate, locale) })
            }
            disabled={busy}
            onConfirm={onRemove}
          >
            {me ? t("leave") : t("remove")}
          </ConfirmAction>
        ) : null}
      </span>
    </li>
  );
};

const Team = ({ partnerId }: { partnerId: string }) => {
  const t = useTranslations("diwan.partnerDesk.team");
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const team = useQuery({
    queryFn: async () =>
      (unwrap(
        await supabase
          .schema("governance")
          .rpc("partner_team", { partner: partnerId })
      ) ?? []) as Teammate[],
    queryKey: [...KEY, "team", partnerId],
  });
  const done = () => queryClient.invalidateQueries({ queryKey: KEY });
  const remove = useMutation({
    mutationFn: async (member: string) =>
      unwrap(
        await supabase
          .schema("governance")
          .rpc("remove_partner_teammate", { member, partner: partnerId })
      ),
    onSuccess: done,
  });
  const lead = useMutation({
    mutationFn: async ({ member, on }: { member: string; on: boolean }) =>
      unwrap(
        await supabase
          .schema("governance")
          .rpc("set_partner_lead", { lead: on, member, partner: partnerId })
      ),
    onSuccess: done,
  });
  const iLead = Boolean(
    team.data?.find((mate) => mate.user_id === user?.id)?.lead
  );
  return (
    <>
      {team.isPending ? <SectionSpinner /> : null}
      <RowList>
        {(team.data ?? []).map((mate) => (
          <TeamMate
            busy={lead.isPending || remove.isPending}
            canLeave={(team.data?.length ?? 0) > 1}
            iLead={iLead}
            key={mate.user_id}
            mate={mate}
            me={mate.user_id === user?.id}
            onLead={() => lead.mutate({ member: mate.user_id, on: !mate.lead })}
            onRemove={() => remove.mutate(mate.user_id)}
          />
        ))}
      </RowList>
      <ErrorLine error={remove.error ?? lead.error} />
      {iLead && (team.data?.length ?? 0) < 6 ? (
        <>
          <InviteByEmail kind="team" partnerId={partnerId} />
          <OpenInvitations kind="team" partnerId={partnerId} />
        </>
      ) : null}
      {(team.data?.length ?? 0) >= 6 ? (
        <p className="type-caption">{t("full")}</p>
      ) : null}
    </>
  );
};

/** /partners/dashboard/people: the partner's guests and its own team. */
export const PartnerPeople = () => {
  const t = useTranslations("diwan.partnerDesk");
  return (
    <PartnerFrame>
      {(partner) => (
        <>
          <DiwanSection
            description={t("guests.lede")}
            id="guests"
            title={t("guests.title")}
          >
            <Guests partnerId={partner.id} />
            <InviteByEmail kind="guest" partnerId={partner.id} />
            <OpenInvitations kind="guest" partnerId={partner.id} />
          </DiwanSection>
          <DiwanSection
            description={t("team.lede")}
            id="team"
            title={t("team.title")}
          >
            <Team partnerId={partner.id} />
          </DiwanSection>
        </>
      )}
    </PartnerFrame>
  );
};
