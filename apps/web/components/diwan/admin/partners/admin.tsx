"use client";

import { SalCard } from "@repo/brand/components/sal/card";
import { Button } from "@repo/brand/components/ui/button";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import { Textarea } from "@repo/brand/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { localized, partners, unwrap } from "@/lib/data";
import { callApi } from "@/lib/diwan/api";
import { Link, useRouter } from "@/lib/diwan/navigation";
import { useGrants } from "@/lib/diwan/queries";
import { hasPermissionAnywhere } from "@/lib/rbac";
import { DiwanSection } from "../../page";
import { OnTheSite } from "../../site-links";
import { SectionSpinner } from "../../states";
import { SectionTabs } from "../admin-shell";
import { ImageField } from "../image-field";
import {
  AdminHeading,
  BilingualField,
  type Column,
  ConfirmAction,
  DataTable,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";
import { useMemberNames } from "../member-picker";
import { memberName } from "../members/directory";
import { VerificationQueue } from "../members/verification";
import { RecordHistory } from "../record-history";
import { CouncilVote } from "./council-vote";
import { Supporters } from "./supporters";

const key = ["admin", "partners"];

type PartnerKind = (typeof partners.partnerKinds)[number];
type PartnerReach = (typeof partners.partnerReach)[number];
type PartnerStatus = (typeof partners.partnerStatuses)[number];
type AgreementStatus = "draft" | "signed" | "ended";
type AffiliationStatus = "pending" | "verified" | "declined" | "ended";
type ConflictKind = (typeof partners.conflictKinds)[number];

const today = () => new Date().toISOString().slice(0, 10);

type PartnerRow = {
  id: string;
  kind: string;
  name_ar: string | null;
  name_en: string;
  status: string;
} & Record<string, unknown>;

const usePartners = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      (unwrap(
        await supabase
          .schema("governance")
          .from("partners")
          .select("*")
          .order("name_en")
      ) ?? []) as PartnerRow[],
    queryKey: [...key, "register"],
  });
};

const usePartnerNames = () => {
  const register = usePartners();
  const locale = useLocale();
  return (id: string) => {
    const row = register.data?.find((p) => p.id === id);
    return row ? localized(row, "name", locale) : "";
  };
};

// ── Register ────────────────────────────────────────────────────────────────

const PartnerForm = ({
  initial,
  onDone,
}: {
  initial: PartnerRow;
  onDone: () => void;
}) => {
  const t = useTranslations("diwan.admin.partners.register");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => ({
    contact_email: String(initial.contact_email ?? ""),
    contact_name: String(initial.contact_name ?? ""),
    contact_role: String(initial.contact_role ?? ""),
    description: {
      ar: String(initial.description_ar ?? ""),
      en: String(initial.description_en ?? ""),
    },
    is_listed: Boolean(initial.is_listed),
    kind: initial.kind as (typeof partners.partnerKinds)[number],
    logo_path: (initial.logo_path as string | null) ?? null,
    name: { ar: initial.name_ar ?? "", en: initial.name_en },
    notes: String(initial.notes ?? ""),
    reach: initial.reach as (typeof partners.partnerReach)[number],
    slug: String(initial.slug ?? ""),
    status: initial.status as (typeof partners.partnerStatuses)[number],
    url: String(initial.url ?? ""),
  }));
  const save = useMutation({
    mutationFn: async () => {
      const row = partners.partnerSchema.parse({
        contact_email: form.contact_email,
        contact_name: form.contact_name,
        contact_role: form.contact_role,
        description_ar: form.description.ar,
        description_en: form.description.en,
        is_listed: form.is_listed,
        kind: form.kind,
        logo_path: form.logo_path,
        name_ar: form.name.ar,
        name_en: form.name.en,
        notes: form.notes,
        reach: form.reach,
        slug: form.slug,
        status: form.status,
        url: form.url,
      });
      const table = supabase.schema("governance").from("partners");
      unwrap(await table.update(row).eq("id", initial.id));
    },
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
        save.mutate();
      }}
    >
      <BilingualField
        label={t("name")}
        maxLength={200}
        onChange={(name) => setForm((f) => ({ ...f, name }))}
        required
        value={form.name}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field hint={t("slugHint")} label={t("slug")}>
          {(id) => (
            <Input
              dir="ltr"
              id={id}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              required
              value={form.slug}
            />
          )}
        </Field>
        <Field label={t("url")}>
          {(id) => (
            <Input
              dir="ltr"
              id={id}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              type="url"
              value={form.url}
            />
          )}
        </Field>
        <Field label={t("kind")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  kind: e.target.value as typeof form.kind,
                }))
              }
              value={form.kind}
            >
              {partners.partnerKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {t(`kinds.${kind}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field hint={t("reachHint")} label={t("reach")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  reach: e.target.value as typeof form.reach,
                }))
              }
              value={form.reach}
            >
              {partners.partnerReach.map((reach) => (
                <option key={reach} value={reach}>
                  {t(`reaches.${reach}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={t("status")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  status: e.target.value as typeof form.status,
                }))
              }
              value={form.status}
            >
              {partners.partnerStatuses.map((status) => (
                <option key={status} value={status}>
                  {t(`statuses.${status}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
      </div>
      <BilingualField
        label={t("description")}
        maxLength={1000}
        multiline
        onChange={(description) => setForm((f) => ({ ...f, description }))}
        value={form.description}
      />
      <ImageField
        area="partners"
        label={t("logo")}
        onChange={(logo_path) => setForm((f) => ({ ...f, logo_path }))}
        value={form.logo_path}
      />
      <div className="flex items-center gap-2">
        <Checkbox
          checked={form.is_listed}
          id="partner-listed"
          onCheckedChange={(checked) =>
            setForm((f) => ({ ...f, is_listed: checked === true }))
          }
        />
        <Label htmlFor="partner-listed">{t("listed")}</Label>
      </div>
      <p className="type-caption">{t("listedHint")}</p>
      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="type-label mb-2">{t("contact")}</legend>
        <Field label={t("contactName")}>
          {(id) => (
            <Input
              dir="auto"
              id={id}
              onChange={(e) =>
                setForm((f) => ({ ...f, contact_name: e.target.value }))
              }
              value={form.contact_name}
            />
          )}
        </Field>
        <Field label={t("contactRole")}>
          {(id) => (
            <Input
              dir="auto"
              id={id}
              onChange={(e) =>
                setForm((f) => ({ ...f, contact_role: e.target.value }))
              }
              value={form.contact_role}
            />
          )}
        </Field>
        <Field label={t("contactEmail")}>
          {(id) => (
            <Input
              dir="ltr"
              id={id}
              onChange={(e) =>
                setForm((f) => ({ ...f, contact_email: e.target.value }))
              }
              type="email"
              value={form.contact_email}
            />
          )}
        </Field>
      </fieldset>
      <Field hint={t("notesHint")} label={t("notes")}>
        {(id) => (
          <Textarea
            dir="auto"
            id={id}
            maxLength={4000}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={3}
            value={form.notes}
          />
        )}
      </Field>
      <div className="flex flex-wrap gap-2">
        <SaveButton pending={save.isPending} />
        <Button onClick={onDone} type="button" variant="ghost">
          {t("cancel")}
        </Button>
      </div>
      <ErrorLine error={save.error} />
    </form>
  );
};

const Register = () => {
  const t = useTranslations("diwan.admin.partners.register");
  const locale = useLocale() as Locale;
  const register = usePartners();

  const columns: Column<PartnerRow>[] = [
    {
      cell: (row) => (
        <Link
          className="font-medium hover:underline"
          href={`/partnerships/${partnerRef(row)}`}
        >
          {localized(row, "name", locale)}
        </Link>
      ),
      header: t("name"),
      key: "name",
    },
    {
      cell: (row) => t(`kinds.${row.kind as PartnerKind}`),
      header: t("kind"),
      key: "kind",
    },
    {
      cell: (row) => t(`reaches.${row.reach as PartnerReach}`),
      header: t("reach"),
      key: "reach",
    },
    {
      cell: (row) => t(`statuses.${row.status as PartnerStatus}`),
      header: t("status"),
      key: "status",
    },
    {
      cell: (row) => (row.is_listed ? t("yes") : t("no")),
      header: t("listedShort"),
      key: "listed",
    },
  ];

  if (register.isPending) {
    return <SectionSpinner />;
  }

  return (
    <div className="grid gap-6">
      <p className="type-body">{t("lede")}</p>
      <DataTable
        columns={columns}
        empty={t("empty")}
        rowKey={(row) => row.id}
        rows={register.data ?? []}
      />
    </div>
  );
};

/** A partner's address in the Diwan: its slug, or its id before it has one. */
const partnerRef = (row: PartnerRow) => String(row.slug || row.id);

/**
 * One partner in the register, edited on its own page (decisions.md): /diwan/partnerships/<slug>. Partners come only from applications
 * (decisions §10), so there is no blank one. Saving
 * returns to the register; a listed partner links to the public Partners
 * page.
 */
export const PartnerPage = ({ partnerRef: ref }: { partnerRef: string }) => {
  const t = useTranslations("diwan.admin.partners.register");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const register = usePartners();
  if (register.isPending) {
    return <SectionSpinner />;
  }
  const row = (register.data ?? []).find((p) => partnerRef(p) === ref);
  if (!row) {
    return (
      <div className="grid gap-4">
        <AdminHeading title={t("missing")} />
        <Link className="link justify-self-start" href="/partnerships">
          {t("back")}
        </Link>
      </div>
    );
  }
  return (
    <div className="grid max-w-3xl gap-8">
      <AdminHeading
        actions={
          <>
            <Link className="link" href="/partnerships">
              {t("back")}
            </Link>
            {row?.is_listed ? <OnTheSite href="/partners" /> : null}
          </>
        }
        title={localized(row, "name", locale)}
      />
      <PartnerForm initial={row} onDone={() => router.push("/partnerships")} />
      {row ? (
        <DiwanSection id="guests" title={t("guests")}>
          <Affiliations partnerId={row.id} />
        </DiwanSection>
      ) : null}
      {row ? <RecordHistory id={row.id} table="governance.partners" /> : null}
    </div>
  );
};

// ── Memoranda (Form company-agreement) ───────────────────────────────────────────────────

type AgreementRow = {
  code: string | null;
  ends_on: string | null;
  asked_grants: string[] | null;
  grants: string[];
  id: string;
  partner_id: string;
  purpose_en: string;
  renew_by: string | null;
  signed_at: string | null;
  starts_on: string;
  status: string;
  student_life_informed_on: string | null;
} & Record<string, unknown>;

const Agreements = () => {
  const t = useTranslations("diwan.admin.partners.agreements");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const grants = useGrants();
  const partnerName = usePartnerNames();
  const canManage = hasPermissionAnywhere(grants.data, "partners.manage");
  const canSign = hasPermissionAnywhere(grants.data, "partners.sign");
  const agreements = useQuery({
    queryFn: async () =>
      (unwrap(
        await supabase
          .schema("governance")
          .from("partner_agreements")
          .select("*")
          .order("starts_on", { ascending: false })
      ) ?? []) as AgreementRow[],
    queryKey: [...key, "agreements"],
  });
  const update = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: {
        ended_on?: string;
        status?: "ended";
        student_life_informed_on?: string;
      };
    }) =>
      unwrap(
        await supabase
          .schema("governance")
          .from("partner_agreements")
          .update(patch)
          .eq("id", id)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const give = useMutation({
    mutationFn: async ({
      grants: given,
      id,
    }: {
      grants: string[];
      id: string;
    }) =>
      unwrap(
        await supabase
          .schema("governance")
          .rpc("give_grants", { agreement_id: id, grants: given })
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const open = async (id: string) => {
    const { url } = await callApi<{ url: string }>(
      supabase,
      "/files/agreement",
      { id }
    );
    window.open(url, "_blank", "noopener");
  };

  const rows = agreements.data ?? [];
  const due = partners.renewalsDue(rows);

  const columns: Column<AgreementRow>[] = [
    {
      cell: (row) => (
        <div className="grid">
          <span className="font-medium">{partnerName(row.partner_id)}</span>
          {row.code ? (
            <span className="type-caption" dir="ltr">
              {row.code}
            </span>
          ) : null}
        </div>
      ),
      header: t("fields.partner"),
      key: "partner",
    },
    {
      cell: (row) => (
        <span className="line-clamp-3" dir="auto">
          {localized(row, "purpose", locale)}
        </span>
      ),
      header: t("fields.purpose"),
      key: "purpose",
    },
    {
      cell: (row) =>
        `${formatLongDate(row.starts_on, locale, true)}${
          row.ends_on ? ` – ${formatLongDate(row.ends_on, locale, true)}` : ""
        }`,
      header: t("dates"),
      key: "dates",
    },
    {
      cell: (row) => (
        <div className="grid gap-1">
          <span>
            {row.grants.length > 0
              ? row.grants
                  .map((g) => t(`grants.${g as partners.AgreementGrant}`))
                  .join(" · ")
              : t("noGrants")}
          </span>
          {/* What the partner asked to turn on waits for Partnerships. */}
          {row.asked_grants ? (
            <span className="type-caption">
              {t("asked", {
                grants:
                  row.asked_grants
                    .map((g) => t(`grants.${g as partners.AgreementGrant}`))
                    .join(" · ") || t("noGrants"),
              })}
            </span>
          ) : null}
        </div>
      ),
      header: t("fields.grants"),
      key: "grants",
    },
    {
      cell: (row) => t(`statuses.${row.status as AgreementStatus}`),
      header: t("status"),
      key: "status",
    },
    {
      cell: (row) => (
        <div className="flex flex-wrap gap-2">
          {row.status === "draft" && canSign ? (
            <Link className="link" href={`/partnerships/agreements/${row.id}`}>
              {t("recordVote")}
            </Link>
          ) : null}
          {row.status !== "draft" && row.signed_document_path ? (
            <Button onClick={() => open(row.id)} size="sm" variant="outline">
              {t("openSigned")}
            </Button>
          ) : null}
          {row.status === "signed" && canManage && row.asked_grants ? (
            <Button
              onClick={() =>
                give.mutate({ grants: row.asked_grants ?? [], id: row.id })
              }
              size="sm"
              variant="outline"
            >
              {t("give")}
            </Button>
          ) : null}
          {row.status === "signed" &&
          canManage &&
          !row.student_life_informed_on ? (
            <Button
              onClick={() =>
                update.mutate({
                  id: row.id,
                  patch: { student_life_informed_on: today() },
                })
              }
              size="sm"
              variant="outline"
            >
              {t("informedStudentLife")}
            </Button>
          ) : null}
          {row.status === "signed" && canManage ? (
            <ConfirmAction
              confirmLabel={t("end")}
              description={t("endConfirm")}
              onConfirm={() =>
                update.mutate({
                  id: row.id,
                  patch: { ended_on: today(), status: "ended" },
                })
              }
            >
              {t("end")}
            </ConfirmAction>
          ) : null}
        </div>
      ),
      header: "",
      key: "actions",
    },
  ];

  if (agreements.isPending) {
    return <SectionSpinner />;
  }

  return (
    <div className="grid gap-6">
      <p className="type-body">{t("lede")}</p>
      {due.length > 0 ? (
        <SalCard>
          <h3 className="type-subheading">{t("renewalsDue")}</h3>
          <ul className="grid gap-1">
            {due.map((a) => (
              <li key={a.id}>
                {partnerName(a.partner_id)} ·{" "}
                {t("renewBy", {
                  date: formatLongDate(a.renew_by ?? "", locale, true),
                })}
              </li>
            ))}
          </ul>
        </SalCard>
      ) : null}
      <ErrorLine error={update.error ?? give.error} />
      <DataTable
        columns={columns}
        empty={t("empty")}
        rowKey={(row) => row.id}
        rows={rows}
      />
    </div>
  );
};

/**
 * A memorandum on its own page, /partnerships/agreements/<id>. One that is
 * still a draft (an application) takes the Council's vote here (decisions
 * §10); memoranda come only from applications, so there is no blank one.
 */
export const AgreementPage = ({ id }: { id: string }) => {
  const t = useTranslations("diwan.admin.partners.agreements");
  const { supabase } = useAuth();
  const router = useRouter();
  const partnerName = usePartnerNames();
  const back = "/partnerships/agreements";
  const done = () => router.push(back);
  const agreement = useQuery({
    queryFn: async () =>
      (unwrap(
        await supabase
          .schema("governance")
          .from("partner_agreements")
          .select("*")
          .eq("id", id)
          .maybeSingle()
      ) ?? null) as AgreementRow | null,
    queryKey: [...key, "agreement", id],
  });
  if (agreement.isPending) {
    return <SectionSpinner />;
  }
  const title = agreement.data
    ? partnerName(agreement.data.partner_id)
    : t("missing");
  return (
    <div className="grid max-w-3xl gap-8">
      <AdminHeading
        actions={
          <Link className="link" href={back}>
            {t("back")}
          </Link>
        }
        title={title}
      />
      {agreement.data?.status === "draft" ? (
        <CouncilVote
          agreementId={agreement.data.id}
          name={title}
          onDone={done}
        />
      ) : null}
    </div>
  );
};

// ── Affiliations ────────────────────────────────────────────────────────────

interface AffiliationRow {
  created_at: string;
  id: string;
  note: string | null;
  partner_id: string;
  status: string;
  user_id: string;
}

/** A partner's guests, on the partner's page (Nov 4, 2026). */
const Affiliations = ({ partnerId }: { partnerId: string }) => {
  const t = useTranslations("diwan.admin.partners.affiliations");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const affiliations = useQuery({
    queryFn: async () =>
      (unwrap(
        await supabase
          .schema("governance")
          .from("partner_affiliations")
          .select("id, partner_id, user_id, status, note, created_at")
          .eq("partner_id", partnerId)
          .order("created_at", { ascending: false })
      ) ?? []) as AffiliationRow[],
    queryKey: [...key, "affiliations", partnerId],
  });
  const rows = affiliations.data ?? [];
  const names = useMemberNames(rows.map((r) => r.user_id));
  const decide = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      unwrap(
        await supabase
          .schema("governance")
          .from("partner_affiliations")
          .update({ status })
          .eq("id", id)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const nameOf = (id: string) => {
    const row = names.data?.find((n) => n.id === id);
    return row ? memberName(row, locale) : "";
  };

  const affiliationActions = (row: AffiliationRow) => {
    if (row.status === "pending") {
      return (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => decide.mutate({ id: row.id, status: "verified" })}
            size="sm"
          >
            {t("verify")}
          </Button>
          <Button
            onClick={() => decide.mutate({ id: row.id, status: "declined" })}
            size="sm"
            variant="outline"
          >
            {t("decline")}
          </Button>
        </div>
      );
    }
    if (row.status === "verified") {
      return (
        <Button
          onClick={() => decide.mutate({ id: row.id, status: "ended" })}
          size="sm"
          variant="outline"
        >
          {t("endAffiliation")}
        </Button>
      );
    }
    return null;
  };

  const columns: Column<AffiliationRow>[] = [
    { cell: (row) => nameOf(row.user_id), header: t("person"), key: "person" },
    {
      cell: (row) => <span dir="auto">{row.note}</span>,
      header: t("note"),
      key: "note",
    },
    {
      cell: (row) => formatLongDate(row.created_at, locale, true),
      header: t("asked"),
      key: "asked",
    },
    {
      cell: (row) => t(`statuses.${row.status as AffiliationStatus}`),
      header: t("status"),
      key: "status",
    },
    {
      cell: (row) => affiliationActions(row),
      header: "",
      key: "actions",
    },
  ];

  if (affiliations.isPending) {
    return <SectionSpinner />;
  }
  return (
    <div className="grid gap-4">
      <p className="type-body">{t("lede")}</p>
      <ErrorLine error={decide.error} />
      <DataTable
        columns={columns}
        empty={t("empty")}
        rowKey={(row) => row.id}
        rows={rows}
      />
    </div>
  );
};

// ── Declarations received (Form needs-list) ───────────────────────────────────────

interface DeclarationRow {
  conflict_items: {
    closed_on: string | null;
    id: string;
    kind: string;
    partner_id: string | null;
    what: string;
  }[];
  id: string;
  nothing_to_declare: boolean;
  received_at: string | null;
  role_title: string | null;
  signed_at: string;
  user_id: string;
}

/** Officers' conflict-of-interest declarations: Council → Disclosures. */
export const Declarations = () => {
  const t = useTranslations("diwan.admin.partners.declarations");
  const tKinds = useTranslations("diwan.declarations.kinds");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const partnerName = usePartnerNames();
  const grants = useGrants();
  const canReceive = hasPermissionAnywhere(grants.data, "governance.manage");
  const declarations = useQuery({
    queryFn: async () =>
      (unwrap(
        await supabase
          .schema("governance")
          .from("conflict_declarations")
          .select(
            "id, user_id, role_title, nothing_to_declare, signed_at, received_at, conflict_items (id, kind, partner_id, what, closed_on)"
          )
          .order("signed_at", { ascending: false })
      ) ?? []) as DeclarationRow[],
    queryKey: [...key, "declarations"],
  });
  const rows = declarations.data ?? [];
  const names = useMemberNames(rows.map((r) => r.user_id));
  const receive = useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await supabase
          .schema("governance")
          .from("conflict_declarations")
          .update({ received_at: new Date().toISOString() })
          .eq("id", id)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const nameOf = (id: string) => {
    const row = names.data?.find((n) => n.id === id);
    return row ? memberName(row, locale) : "";
  };

  const receipt = (row: DeclarationRow) => {
    if (row.received_at) {
      return formatLongDate(row.received_at, locale, true);
    }
    if (!canReceive) {
      return t("notReceived");
    }
    return (
      <Button onClick={() => receive.mutate(row.id)} size="sm">
        {t("receive")}
      </Button>
    );
  };

  const columns: Column<DeclarationRow>[] = [
    {
      cell: (row) => (
        <div className="grid">
          <span className="font-medium">{nameOf(row.user_id)}</span>
          <span className="type-caption" dir="auto">
            {row.role_title}
          </span>
        </div>
      ),
      header: t("person"),
      key: "person",
    },
    {
      cell: (row) =>
        row.nothing_to_declare ? (
          t("nothing")
        ) : (
          <ul className="grid gap-1">
            {row.conflict_items.map((item) => (
              <li key={item.id}>
                <span className="font-medium">
                  {tKinds(item.kind as ConflictKind)}
                </span>
                {item.partner_id ? ` · ${partnerName(item.partner_id)}` : ""}
                {": "}
                <span dir="auto">{item.what}</span>
                {item.closed_on ? ` (${t("closed")})` : ""}
              </li>
            ))}
          </ul>
        ),
      header: t("declared"),
      key: "declared",
    },
    {
      cell: (row) => formatLongDate(row.signed_at, locale, true),
      header: t("signed"),
      key: "signed",
    },
    {
      cell: (row) => receipt(row),
      header: t("received"),
      key: "received",
    },
  ];

  if (declarations.isPending) {
    return <SectionSpinner />;
  }
  return (
    <div className="grid gap-4">
      <ErrorLine error={receive.error} />
      <DataTable
        columns={columns}
        empty={t("empty")}
        rowKey={(row) => row.id}
        rows={rows}
      />
    </div>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────

const partnerViews = ["applications", "register", "agreements"] as const;
export type PartnerView = (typeof partnerViews)[number];

const viewPath = (view: PartnerView) =>
  view === "register" ? "/partnerships" : `/partnerships/${view}`;

/**
 * Partners in one place (Nov 4, 2026): applications waiting for the
 * President, the register (each partner's page holds its guests),
 * and memoranda, each view at its own address; places with partners
 * are among every opening at Membership → Openings.
 */
export const PartnersAdmin = ({ view }: { view?: PartnerView }) => {
  const t = useTranslations("diwan.admin.partners");
  const grants = useGrants();
  const canManage = hasPermissionAnywhere(grants.data, "partners.manage");
  const canSign = hasPermissionAnywhere(grants.data, "partners.sign");
  const shown = partnerViews.filter((v) => {
    if (v === "agreements") {
      return true;
    }
    if (v === "applications") {
      return canManage || canSign;
    }
    return canManage;
  });
  const here = view ?? (canManage ? "register" : "agreements");

  return (
    <div className="grid gap-6">
      <AdminHeading title={t("title")}>{t("lede")}</AdminHeading>
      <SectionTabs
        label={t("title")}
        tabs={shown.map((v) => ({ href: viewPath(v), label: t(`tabs.${v}`) }))}
      />
      {here === "applications" && (canManage || canSign) ? (
        <VerificationQueue />
      ) : null}
      {here === "register" && canManage ? (
        <>
          <Register />
          <Supporters />
        </>
      ) : null}
      {here === "agreements" ? <Agreements /> : null}
    </div>
  );
};
