"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { cn } from "@repo/design-system/lib/utils";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link, usePathname } from "@repo/internationalization/navigation";
import { localized, type partners, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useState } from "react";
import { type MyPartner, useMyPartners } from "@/lib/nexus/partners";
import {
  BilingualField,
  ConfirmAction,
  ErrorLine,
  Field,
  SaveButton,
} from "../admin/kit";
import { DiwanPage, DiwanSection, RowList } from "../page";
import { ErrorState, SectionSpinner } from "../states";

const KEY = ["partner-desk"] as const;

const TABS = [
  { href: "/partners/dashboard", key: "profile" },
  { href: "/partners/dashboard/perks", key: "perks" },
  { href: "/partners/dashboard/people", key: "people" },
] as const;

/**
 * The partner's dashboard (owner, Oct 31, 2026: one fixed address,
 * /partners/dashboard): its title and three tabs, Profile, Perks, People.
 * Someone on two partners' teams keeps the first.
 */
const PartnerFrame = ({
  children,
}: {
  children: (partner: MyPartner) => ReactNode;
}) => {
  const t = useTranslations("nexus.partnerDesk");
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
    <DiwanPage lede={t("lede")} title={localized(partner, "name", locale)}>
      <nav
        aria-label={t("tabsLabel")}
        className="overflow-x-auto border-line border-b"
      >
        <ul className="flex gap-x-6">
          {TABS.map((tab) => {
            const here = pathname === tab.href;
            return (
              <li className="shrink-0" key={tab.href}>
                <Link
                  aria-current={here ? "page" : undefined}
                  className={cn(
                    "block whitespace-nowrap border-b-[1.5px] py-3 font-medium text-sm hover:text-accent",
                    here
                      ? "border-accent text-text"
                      : "border-transparent text-text-secondary"
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
  contact_email: string | null;
  contact_name: string | null;
  contact_role: string | null;
  description_ar: string | null;
  description_en: string | null;
  id: string;
  name_ar: string | null;
  name_en: string;
  url: string | null;
}

interface AgreementRow {
  grants: string[];
  id: string;
  partner_signatory: string | null;
  partner_will: string | null;
  purpose_en: string;
  sal_will: string | null;
  signed_at: string | null;
  status: string;
}

const ProfileForm = ({ row }: { row: PartnerRow }) => {
  const t = useTranslations("nexus.partnerDesk.profile");
  const tr = useTranslations("nexus.admin.partners.register");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    contact_email: row.contact_email ?? "",
    contact_name: row.contact_name ?? "",
    contact_role: row.contact_role ?? "",
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
            contact_email: form.contact_email.trim() || null,
            contact_name: form.contact_name.trim() || null,
            contact_role: form.contact_role.trim() || null,
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
  const set =
    (key: "contact_email" | "contact_name" | "contact_role" | "url") =>
    (event: { target: { value: string } }) =>
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
      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="type-label mb-2">{tr("contact")}</legend>
        <Field label={tr("contactName")}>
          {(id) => (
            <Input
              dir="auto"
              id={id}
              onChange={set("contact_name")}
              value={form.contact_name}
            />
          )}
        </Field>
        <Field label={tr("contactRole")}>
          {(id) => (
            <Input
              dir="auto"
              id={id}
              onChange={set("contact_role")}
              value={form.contact_role}
            />
          )}
        </Field>
        <Field label={tr("contactEmail")}>
          {(id) => (
            <Input
              dir="ltr"
              id={id}
              onChange={set("contact_email")}
              type="email"
              value={form.contact_email}
            />
          )}
        </Field>
      </fieldset>
      <SaveButton pending={save.isPending} success={save.isSuccess} />
      <ErrorLine error={save.error} />
    </form>
  );
};

const Memoranda = ({ partnerId }: { partnerId: string }) => {
  const t = useTranslations("nexus.partnerDesk.memorandum");
  const tg = useTranslations("nexus.admin.partners.agreements.grants");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const agreements = useQuery({
    queryFn: async () =>
      (unwrap(
        await supabase
          .schema("governance")
          .from("partner_agreements")
          .select(
            "id, purpose_en, partner_will, sal_will, grants, status, partner_signatory, signed_at"
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
              ? t("signed", {
                  date: formatLongDate(a.signed_at, locale),
                  name: a.partner_signatory ?? "",
                })
              : t(a.status === "draft" ? "waiting" : "ended")}
          </p>
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
        </li>
      ))}
    </RowList>
  );
};

/** /partners/dashboard: the partner's profile and its memoranda. */
export const PartnerProfile = () => {
  const t = useTranslations("nexus.partnerDesk");
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
          .select(
            "id, name_en, name_ar, url, description_en, description_ar, contact_name, contact_role, contact_email"
          )
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

// ── Perks ───────────────────────────────────────────────────────────────────

interface Offer extends Record<string, unknown> {
  code: string | null;
  details_en: string;
  ends_on: string | null;
  id: string;
  is_published: boolean;
  title_ar: string | null;
  title_en: string;
}

const NewPerk = ({ partnerId }: { partnerId: string }) => {
  const t = useTranslations("nexus.partnerDesk.perks");
  const to = useTranslations("nexus.admin.partners.offers");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const empty = {
    code: "",
    details: { ar: "", en: "" },
    ends_on: "",
    publish: true,
    title: { ar: "", en: "" },
  };
  const [form, setForm] = useState(empty);
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("member_offers")
          .insert({
            code: form.code.trim() || null,
            details_ar: form.details.ar.trim() || null,
            details_en: form.details.en.trim(),
            ends_on: form.ends_on || null,
            is_published: form.publish,
            partner_id: partnerId,
            title_ar: form.title.ar.trim() || null,
            title_en: form.title.en.trim(),
          })
      ),
    onSuccess: async () => {
      setForm(empty);
      await queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
  return (
    <form
      className="grid gap-6"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        add.mutate();
      }}
    >
      <BilingualField
        label={to("title")}
        maxLength={200}
        onChange={(title) => setForm((f) => ({ ...f, title }))}
        value={form.title}
      />
      <BilingualField
        label={to("details")}
        maxLength={2000}
        multiline
        onChange={(details) => setForm((f) => ({ ...f, details }))}
        value={form.details}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field hint={to("codeHint")} label={to("code")}>
          {(id) => (
            <Input
              dir="ltr"
              id={id}
              maxLength={60}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              value={form.code}
            />
          )}
        </Field>
        <Field label={to("ends_on")}>
          {(id) => (
            <Input
              dir="ltr"
              id={id}
              onChange={(e) =>
                setForm((f) => ({ ...f, ends_on: e.target.value }))
              }
              type="date"
              value={form.ends_on}
            />
          )}
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={form.publish}
          id="perk-publish"
          onCheckedChange={(checked) =>
            setForm((f) => ({ ...f, publish: checked === true }))
          }
        />
        <Label htmlFor="perk-publish">{to("publishNow")}</Label>
      </div>
      <Button
        className="justify-self-start"
        disabled={add.isPending}
        type="submit"
      >
        {t("add")}
      </Button>
      <ErrorLine error={add.error} />
    </form>
  );
};

/** /partners/dashboard/perks: what the partner offers members and guests. */
export const PartnerPerks = () => (
  <PartnerFrame>
    {(partner) => <PerksList partnerId={partner.id} />}
  </PartnerFrame>
);

const PerksList = ({ partnerId }: { partnerId: string }) => {
  const t = useTranslations("nexus.partnerDesk.perks");
  const to = useTranslations("nexus.admin.partners.offers");
  const locale = useLocale() as Locale;
  const queryClient = useQueryClient();
  const { supabase } = useAuth();
  const change = useMutation({
    mutationFn: async (input: {
      id: string;
      publish?: boolean;
      remove?: boolean;
    }) => {
      const table = supabase.schema("governance").from("member_offers");
      const result = input.remove
        ? await table.delete().eq("id", input.id)
        : await table
            .update({ is_published: input.publish ?? false })
            .eq("id", input.id);
      return unwrap(result);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
  const offers = useQuery({
    queryFn: async () =>
      (unwrap(
        await supabase
          .schema("governance")
          .from("member_offers")
          .select(
            "id, title_en, title_ar, details_en, code, ends_on, is_published"
          )
          .eq("partner_id", partnerId)
          .order("created_at", { ascending: false })
      ) ?? []) as Offer[],
    queryKey: [...KEY, "perks", partnerId],
  });
  const granted = useQuery({
    queryFn: async () =>
      (
        (unwrap(
          await supabase
            .schema("governance")
            .from("partner_agreements")
            .select("grants")
            .eq("partner_id", partnerId)
            .eq("status", "signed")
        ) ?? []) as { grants: string[] }[]
      ).some((a) => a.grants.includes("member_offer")),
    queryKey: [...KEY, "perk-grant", partnerId],
  });
  return (
    <>
      <DiwanSection id="perks" title={t("title")}>
        <p className="type-body">
          {granted.data === false ? t("notGranted") : t("lede")}
        </p>
        {offers.isPending ? <SectionSpinner /> : null}
        {offers.data?.length === 0 ? (
          <p className="type-body text-text-secondary">{t("empty")}</p>
        ) : null}
        <RowList>
          {(offers.data ?? []).map((offer) => (
            <li className="grid gap-2 py-5" key={offer.id}>
              <p className="font-medium">{localized(offer, "title", locale)}</p>
              <p className="type-body whitespace-pre-line" dir="auto">
                {offer.details_en}
              </p>
              <p className="type-caption">
                {offer.is_published ? to("published") : t("hidden")}
                {offer.ends_on
                  ? ` · ${t("until", { date: formatLongDate(offer.ends_on, locale) })}`
                  : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={change.isPending}
                  onClick={() =>
                    change.mutate({
                      id: offer.id,
                      publish: !offer.is_published,
                    })
                  }
                  size="sm"
                  variant="outline"
                >
                  {offer.is_published ? to("unpublish") : to("publish")}
                </Button>
                <ConfirmAction
                  confirmLabel={t("remove")}
                  description={t("removeConfirm")}
                  disabled={change.isPending}
                  onConfirm={() =>
                    change.mutate({ id: offer.id, remove: true })
                  }
                >
                  {t("remove")}
                </ConfirmAction>
              </div>
            </li>
          ))}
        </RowList>
        <ErrorLine error={change.error} />
      </DiwanSection>
      <DiwanSection id="new-perk" title={t("new")}>
        <NewPerk partnerId={partnerId} />
      </DiwanSection>
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
  const t = useTranslations("nexus.partnerDesk.guests");
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
              <p className="break-all text-sm" dir="ltr">
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
  kind: "team" | "guest";
}

/** The link an invitation is, on this site (/invite/<code>). */
const inviteUrl = (code: string, locale: string) =>
  `${window.location.origin}${locale === "en" ? "" : `/${locale}`}/invite/${code}`;

/**
 * An email invitation: to the team (the Lead's) or as a guest. The person
 * gets an email; the link works for fourteen days. With no partner, the
 * Society's own guest (Membership, in the Diwan).
 */
export const InviteByEmail = ({
  kind,
  partnerId,
}: {
  kind: "team" | "guest";
  partnerId: string | null;
}) => {
  const t = useTranslations("nexus.partnerDesk.invite");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const invite = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("partner_invitations")
          .insert({ email: email.trim(), kind, partner_id: partnerId })
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
  kind: "team" | "guest";
  partnerId: string | null;
}) => {
  const t = useTranslations("nexus.partnerDesk.invite");
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
              <span className="break-all text-sm" dir="ltr">
                {invitation.email ?? t("link")}
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

/**
 * A shareable guest link, for the partner's own group: whoever joins
 * through it waits until the partner verifies them. The Society's own link
 * (no partner) welcomes its guests at once.
 */
export const ShareableLink = ({ partnerId }: { partnerId: string | null }) => {
  const t = useTranslations("nexus.partnerDesk.invite");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const make = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("partner_invitations")
          .insert({ kind: "guest", partner_id: partnerId })
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
  return (
    <div className="grid gap-2">
      <p className="type-caption">
        {partnerId ? t("linkHint") : t("societyLinkHint")}
      </p>
      <Button
        className="justify-self-start"
        disabled={make.isPending}
        onClick={() => make.mutate()}
        type="button"
        variant="outline"
      >
        {t("makeLink")}
      </Button>
      <ErrorLine error={make.error} />
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
  const t = useTranslations("nexus.partnerDesk.team");
  const locale = useLocale() as Locale;
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-2 py-4">
      <span className="grid gap-1">
        <span>
          <span className="font-medium">{personName(mate, locale)}</span>{" "}
          <span className="break-all text-sm text-text-secondary" dir="ltr">
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
  const t = useTranslations("nexus.partnerDesk.team");
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
  const t = useTranslations("nexus.partnerDesk");
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
            <ShareableLink partnerId={partner.id} />
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
