"use client";

import { SalCard } from "@repo/brand/components/sal/card";
import { Button } from "@repo/brand/components/ui/button";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import { Textarea } from "@repo/brand/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import {
  formatDateRange,
  formatLongDate,
} from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { slugFromTitle } from "@/lib/addresses";
import { useAuth } from "@/lib/auth/provider";
import { localized, partners, unwrap } from "@/lib/data";
import { callApi } from "@/lib/diwan/api";
import { Link, useRouter } from "@/lib/diwan/navigation";
import { useGrants } from "@/lib/diwan/queries";
import { useQueryState } from "@/lib/diwan/use-query-param";
import type { Organization } from "@/lib/institutions";
import { hasPermissionAnywhere } from "@/lib/rbac";
import { buckets, getMediaUrl } from "@/lib/storage";
import { DiwanSection } from "../../page";
import { OnTheSite } from "../../site-links";
import { EmptyLine, SectionSpinner } from "../../states";
import { AddressLine } from "../address-line";
import { SectionTabs } from "../admin-shell";
import { ImageField } from "../image-field";
import {
  AddInPlace,
  AdminHeading,
  BilingualField,
  type Column,
  ConfirmAction,
  DataTable,
  ErrorLine,
  Field,
  RecordList,
  RecordView,
  SaveButton,
  SelectInput,
} from "../kit";
import { useMemberNames } from "../member-picker";
import { memberName } from "../members/directory";
import { VerificationQueue } from "../members/verification";
import { RecordHistory } from "../record-history";
import { CouncilVote } from "./council-vote";
import {
  PartnerLinking,
  PartnerPeople,
  PendingListing,
  RegisterLogo,
  usePartnerOwned,
} from "./listing";

const key = ["admin", "partners"];

type PartnerKind = (typeof partners.partnerKinds)[number];
type PartnerReach = (typeof partners.partnerReach)[number];
type PartnerStatus = (typeof partners.partnerStatuses)[number];
type AgreementStatus = "draft" | "signed" | "ended";
/**
 * What an entry in the one register is (decisions.md, Partners): a partner
 * comes only from an application; campus partners and sponsors in kind are
 * added here by Partnerships.
 */
type Relation = "partner" | "campus" | "sponsor";
const ADDED_RELATIONS = ["campus", "sponsor"] as const;
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
          .schema("api")
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

/** The fields only the Society keeps (decisions.md, Partners). */
const societyFields = (form: PartnerFormState) => ({
  is_listed: form.is_listed,
  kind: form.kind,
  logo_path: form.logo_path,
  logo_shows_name: form.logo_shows_name,
  notes: form.notes.trim() || null,
  reach: form.reach,
  slug: form.slug,
  status: form.status,
});

const initialForm = (initial: PartnerRow) => ({
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
  logo_shows_name: initial.logo_shows_name !== false,
  name: { ar: initial.name_ar ?? "", en: initial.name_en },
  notes: String(initial.notes ?? ""),
  reach: initial.reach as (typeof partners.partnerReach)[number],
  relation: String(initial.relation ?? "partner") as Relation,
  slug: String(initial.slug ?? ""),
  status: initial.status as (typeof partners.partnerStatuses)[number],
  url: String(initial.url ?? ""),
});

type PartnerFormState = ReturnType<typeof initialForm>;
type SetPartnerForm = (
  update: (form: PartnerFormState) => PartnerFormState
) => void;

/**
 * Each entry's one logo (decisions.md, Partners; Events), which sits on a
 * paper-colored tile in dark mode, and "The logo shows the name". On a partner's own
 * entry a change here is logged and the Lead is told.
 */
const LogoFields = ({
  form,
  owned,
  setForm,
}: {
  readonly form: PartnerFormState;
  readonly owned: boolean;
  readonly setForm: SetPartnerForm;
}) => {
  const t = useTranslations("diwan.admin.partners.register");
  return (
    <fieldset className="grid gap-4">
      <legend className="type-label mb-2">{t("logos")}</legend>
      {owned ? <p className="type-caption">{t("logoTellsLead")}</p> : null}
      <ImageField
        area="partners"
        kind="logo"
        label={t("logo")}
        onChange={(logo_path) => setForm((f) => ({ ...f, logo_path }))}
        value={form.logo_path}
      />
      <div className="flex items-center gap-2">
        <Checkbox
          checked={form.logo_shows_name}
          id="partner-logo-name"
          onCheckedChange={(checked) =>
            setForm((f) => ({ ...f, logo_shows_name: checked === true }))
          }
        />
        <Label htmlFor="partner-logo-name">{t("logoShowsName")}</Label>
      </div>
      <p className="type-caption">{t("logoShowsNameHint")}</p>
    </fieldset>
  );
};

/** The fields the Society writes on an entry it added: the whole listing. */
const ListingFields = ({
  form,
  setForm,
}: {
  readonly form: PartnerFormState;
  readonly setForm: SetPartnerForm;
}) => {
  const t = useTranslations("diwan.admin.partners.register");
  return (
    <>
      <BilingualField
        label={t("name")}
        maxLength={200}
        onChange={(name) => setForm((f) => ({ ...f, name }))}
        required
        value={form.name}
      />
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
      <BilingualField
        label={t("description")}
        maxLength={1000}
        multiline
        onChange={(description) => setForm((f) => ({ ...f, description }))}
        value={form.description}
      />
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
    </>
  );
};

/**
 * A partner's own listing, as it stands (decisions.md, Partners): its
 * name, locked to the memorandum, and its description and link, which the
 * partner changes from its dashboard for the Director of Partnerships to
 * approve.
 */
const OwnedListing = ({ row }: { readonly row: PartnerRow }) => {
  const t = useTranslations("diwan.admin.partners.register");
  const locale = useLocale() as Locale;
  return (
    <section className="grid gap-3">
      <p className="type-caption">{t("ownedLede")}</p>
      <dl className="grid gap-2 sm:grid-cols-[10rem_1fr]">
        <dt className="type-label">{t("name")}</dt>
        <dd className="type-body">
          {row.name_en}
          {row.name_ar ? (
            <>
              {" · "}
              <span dir="rtl" lang="ar">
                {row.name_ar}
              </span>
            </>
          ) : null}
        </dd>
        <dt className="type-label">{t("url")}</dt>
        <dd className="type-body break-all" dir="ltr">
          {String(row.url ?? "") || "—"}
        </dd>
        <dt className="type-label">{t("description")}</dt>
        <dd className="type-body whitespace-pre-line">
          {localized(
            {
              description_ar: row.description_ar as string | null,
              description_en: row.description_en as string | null,
            },
            "description",
            locale
          ) || "—"}
        </dd>
      </dl>
      <TypedContact row={row} />
    </section>
  );
};

/**
 * A contact typed into the entry before the partner had a Lead
 * (decisions.md, Partners): kept as the Society's internal note, staff
 * only and never listed, until a Lead signs up, when the database drops it.
 */
const TypedContact = ({ row }: { readonly row: PartnerRow }) => {
  const t = useTranslations("diwan.admin.partners.register");
  const parts = [row.contact_name, row.contact_role, row.contact_email]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return null;
  }
  return (
    <div className="border-line grid gap-1 border-t pt-3">
      <p className="type-label">{t("typedContact")}</p>
      <p className="type-body">
        <bdi>{parts.join(" · ")}</bdi>
      </p>
      <p className="type-caption">{t("typedContactLede")}</p>
    </div>
  );
};

const PartnerForm = ({
  initial,
  onDone,
  owned,
}: {
  initial: PartnerRow;
  onDone: () => void;
  owned: boolean;
}) => {
  const t = useTranslations("diwan.admin.partners.register");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => initialForm(initial));
  const save = useMutation({
    mutationFn: async () => {
      // A partner's own entry: the Society writes only its own fields.
      const update = owned
        ? societyFields(form)
        : {
            ...partners.partnerSchema.parse({
              contact_email: form.contact_email,
              contact_name: form.contact_name,
              contact_role: form.contact_role,
              description_ar: form.description.ar,
              description_en: form.description.en,
              is_listed: form.is_listed,
              kind: form.kind,
              name_ar: form.name.ar,
              name_en: form.name.en,
              notes: form.notes,
              reach: form.reach,
              slug: form.slug,
              status: form.status,
              url: form.url,
            }),
            ...societyFields(form),
            relation: form.relation,
          };
      unwrap(
        await supabase
          .schema("api")
          .from("partners")
          .update(update)
          .eq("id", initial.id)
      );
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
      {owned ? (
        <OwnedListing row={initial} />
      ) : (
        <ListingFields form={form} setForm={setForm} />
      )}
      <SocietyFields form={form} owned={owned} setForm={setForm} />
      <LogoFields form={form} owned={owned} setForm={setForm} />
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

/** The address, what it is, its reach and its standing. */
const SocietyFields = ({
  form,
  owned,
  setForm,
}: {
  readonly form: PartnerFormState;
  readonly owned: boolean;
  readonly setForm: SetPartnerForm;
}) => {
  const t = useTranslations("diwan.admin.partners.register");
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <AddressLine fixed path={`/diwan/partnerships/${form.slug}`} />
      {owned || form.relation === "partner" ? null : (
        <Field hint={t("relationHint")} label={t("relation")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  relation: e.target.value as Relation,
                }))
              }
              value={form.relation}
            >
              {ADDED_RELATIONS.map((relation) => (
                <option key={relation} value={relation}>
                  {t(`relations.${relation}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
      )}
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
  );
};

const Register = () => {
  const t = useTranslations("diwan.admin.partners.register");
  const tk = useTranslations("diwan.admin.kit");
  const locale = useLocale() as Locale;
  const register = usePartners();
  // The filter lives in the query string beside the find line
  // (decisions.md, The site: "One list").
  const [statusParam, setStatus] = useQueryState("status");
  const status = (partners.partnerStatuses as readonly string[]).includes(
    statusParam
  )
    ? statusParam
    : "";

  const columns: Column<PartnerRow>[] = [
    {
      // The logo as the public sees it; a missing one is marked.
      cell: (row) => (
        <RegisterLogo
          org={row as unknown as Organization & { name_en: string }}
        />
      ),
      header: t("logo"),
      key: "logo",
    },
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
      cell: (row) => t(`relations.${(row.relation ?? "partner") as Relation}`),
      header: t("relation"),
      key: "relation",
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
      <AddOrganization />
      <RecordList
        empty={
          <EmptyLine action={{ href: "/partnerships", label: tk("showAll") }}>
            {t("empty")}
          </EmptyLine>
        }
        filters={
          <Field label={t("status")}>
            {(id) => (
              <SelectInput
                className="w-44"
                id={id}
                onChange={(e) => setStatus(e.target.value)}
                value={status}
              >
                <option value="">{tk("all")}</option>
                {partners.partnerStatuses.map((value) => (
                  <option key={value} value={value}>
                    {t(`statuses.${value}`)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
        }
        items={(register.data ?? []).filter(
          (row) => !status || row.status === status
        )}
        matches={(row, q) =>
          [row.name_en, row.name_ar, row.slug].some((v) =>
            String(v ?? "")
              .toLowerCase()
              .includes(q)
          )
        }
      >
        {(found) => (
          <DataTable
            columns={columns}
            rowKey={(row) => row.id}
            rows={[...found]}
          />
        )}
      </RecordList>
    </div>
  );
};

/**
 * A campus partner or a sponsor in kind, added in place (decisions.md,
 * Partners): its two names here, the rest (logo, line, link) on its page.
 */
const AddOrganization = () => {
  const t = useTranslations("diwan.admin.partners.register");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [relation, setRelation] = useState<Relation>("campus");
  const [name, setName] = useState({ ar: "", en: "" });
  const add = useMutation({
    mutationFn: async () => {
      const slug = slugFromTitle(name.en, name.ar);
      unwrap(
        await supabase
          .schema("api")
          .from("partners")
          .insert({
            is_listed: true,
            kind: relation === "campus" ? "department" : "other",
            name_ar: name.ar.trim(),
            name_en: name.en.trim(),
            reach: relation === "campus" ? "auib" : "iraq",
            relation,
            slug,
            status: "active",
          })
      );
      return slug;
    },
    onSuccess: async (slug) => {
      await queryClient.invalidateQueries({ queryKey: key });
      router.push(`/partnerships/${slug}`);
    },
  });
  return (
    <AddInPlace label={t("addTitle")}>
      {() => (
        <form
          className="grid max-w-2xl gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            add.mutate();
          }}
        >
          <Field label={t("relation")}>
            {(id) => (
              <SelectInput
                id={id}
                onChange={(e) => setRelation(e.target.value as Relation)}
                value={relation}
              >
                {ADDED_RELATIONS.map((r) => (
                  <option key={r} value={r}>
                    {t(`relations.${r}`)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <BilingualField label={t("name")} onChange={setName} value={name} />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={!(name.en.trim() && name.ar.trim()) || add.isPending}
              type="submit"
              variant="outline"
            >
              {t("add")}
            </Button>
            <ErrorLine error={add.error} />
          </div>
        </form>
      )}
    </AddInPlace>
  );
};

/**
 * A logo the partner sent from its dashboard (decisions.md, Partners),
 * waiting for Partnerships: approved, it is the one shown; declined, the
 * partner sends another. Partnerships can still upload one below.
 */
const PendingLogo = ({
  partnerId,
  path,
}: {
  readonly partnerId: string;
  readonly path: string;
}) => {
  const t = useTranslations("diwan.admin.partners.register.pendingLogo");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const decide = useMutation({
    mutationFn: async (approve: boolean) => {
      const declined = unwrap(
        await supabase
          .schema("api")
          .rpc("decide_partner_logo", { approve, partner: partnerId })
      );
      if (declined) {
        await supabase.storage.from(buckets.media.id).remove([declined]);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  return (
    <DiwanSection description={t("lede")} id="pending-logo" title={t("title")}>
      {/* biome-ignore lint/performance/noImgElement: a partner logo from the media bucket, any size */}
      <img
        alt=""
        className="h-16 w-auto justify-self-start"
        height={64}
        src={getMediaUrl(supabase, path)}
        width={128}
      />
      <div className="flex flex-wrap items-center gap-4">
        <Button
          disabled={decide.isPending}
          onClick={() => decide.mutate(true)}
          size="sm"
          variant="outline"
        >
          {t("approve")}
        </Button>
        <button
          className="link"
          disabled={decide.isPending}
          onClick={() => decide.mutate(false)}
          type="button"
        >
          {t("decline")}
        </button>
      </div>
      <ErrorLine error={decide.error} />
    </DiwanSection>
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
/**
 * The entry's page (decisions.md, The site; Partners): its logo as the
 * public sees it, what waits for a decision (a logo, a listing change, a
 * possible match), then the form; on a partner's own entry, its people
 * from their accounts.
 */
const PartnerPageBody = ({ row }: { readonly row: PartnerRow }) => {
  const router = useRouter();
  const owned = usePartnerOwned(row.id);
  if (owned.isPending) {
    return <SectionSpinner />;
  }
  const isOwned = owned.data === true;
  return (
    <>
      <RegisterLogo
        org={row as unknown as Organization & { name_en: string }}
      />
      <PartnerLinking partnerId={row.id} />
      {row.logo_pending_path ? (
        <PendingLogo partnerId={row.id} path={String(row.logo_pending_path)} />
      ) : null}
      {isOwned ? (
        <PendingListing
          current={{
            description_ar: (row.description_ar as string | null) ?? null,
            description_en: (row.description_en as string | null) ?? null,
            url: (row.url as string | null) ?? null,
          }}
          partnerId={row.id}
        />
      ) : null}
      <PartnerForm
        initial={row}
        onDone={() => router.push("/partnerships")}
        owned={isOwned}
      />
      {isOwned ? <PartnerPeople partnerId={row.id} /> : null}
    </>
  );
};

export const PartnerPage = ({ partnerRef: ref }: { partnerRef: string }) => {
  const t = useTranslations("diwan.admin.partners.register");
  const locale = useLocale() as Locale;
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
    <RecordView
      actions={row?.is_listed ? <OnTheSite href="/partners" /> : undefined}
      back={
        <Link className="link" href="/partnerships">
          {t("back")}
        </Link>
      }
      history={
        row ? <RecordHistory id={row.id} table="governance.partners" /> : null
      }
      narrow
      title={localized(row, "name", locale)}
    >
      <PartnerPageBody row={row} />
      {row ? (
        <DiwanSection id="guests" title={t("guests")}>
          <Affiliations partnerId={row.id} />
        </DiwanSection>
      ) : null}
    </RecordView>
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
          .schema("api")
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
          .schema("api")
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
          .schema("api")
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
        row.ends_on
          ? formatDateRange(row.starts_on, row.ends_on, locale, true)
          : formatLongDate(row.starts_on, locale, true),
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
          .schema("api")
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
          .schema("api")
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
          .schema("api")
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
          .schema("api")
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
          .schema("api")
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
      {here === "register" && canManage ? <Register /> : null}
      {here === "agreements" ? <Agreements /> : null}
    </div>
  );
};
