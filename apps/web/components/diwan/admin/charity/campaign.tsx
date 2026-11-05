"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import type { Locale } from "@repo/internationalization";
import {
  formatIqd,
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { hasPermission } from "@repo/rbac";
import { charity, localized, unwrap } from "@repo/sal-data";
import { removeFiles, uploadReceipt } from "@repo/storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useId, useState } from "react";
import { DateInput } from "@/components/fields/date-input";
import { FileInput } from "@/components/fields/file-input";
import { callApi } from "@/lib/diwan/api";
import { Link, useRouter } from "@/lib/diwan/navigation";
import { useGrants } from "@/lib/diwan/queries";
import { useQueryParam } from "@/lib/diwan/use-query-param";
import { ErrorState, SectionSpinner } from "../../states";
import { SectionTabs } from "../admin-shell";
import { useProgrammeOptions } from "../events/data";
import { slugify } from "../events/editor";
import {
  AddInPlace,
  AdminHeading,
  BilingualField,
  type Column,
  ConfirmAction,
  DataTable,
  ErrorLine,
  ExportButton,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";
import { MemberPicker, useMemberNames } from "../member-picker";
import { memberName } from "../members/directory";
import { RecordHistory } from "../record-history";
import { type CampaignTab, campaignTabs } from "../tabs";
import { CampaignCatalog } from "./catalog";

// ── Settings ────────────────────────────────────────────────────────────────

/** The days of each stage (owner, Nov 4, 2026), shown on the program's page. */
const STAGE_DATES = [
  "boxes_on",
  "donations_starts_on",
  "donations_ends_on",
  "fair_starts_on",
  "fair_ends_on",
  "handover_due_on",
  "impact_due_on",
] as const;
type StageDate = (typeof STAGE_DATES)[number];
const noStageDates = Object.fromEntries(
  STAGE_DATES.map((k) => [k, ""])
) as Record<StageDate, string>;

interface PointRow {
  readonly hours: { ar: string; en: string };
  readonly key: string;
  readonly place: { ar: string; en: string };
}
let pointKey = 0;
const newPoint = (p?: charity.DropOffPoint): PointRow => {
  pointKey += 1;
  return {
    hours: { ar: p?.hours_ar ?? "", en: p?.hours_en ?? "" },
    key: `point-${pointKey}`,
    place: { ar: p?.place_ar ?? "", en: p?.place_en ?? "" },
  };
};

const CampaignSettings = ({ campaignId }: { campaignId: string | null }) => {
  const t = useTranslations("diwan.admin.charity");
  const tk = useTranslations("diwan.admin.kit");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const programmes = useProgrammeOptions(null);
  const [form, setForm] = useState({
    ...noStageDates,
    ends_on: "",
    partner_id: "",
    programme_id: "",
    slug: "",
    starts_on: "",
    status: "draft",
    summary: { ar: "", en: "" },
    title: { ar: "", en: "" },
  });
  const [points, setPoints] = useState<PointRow[]>([]);

  const existing = useQuery({
    enabled: Boolean(campaignId),
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("charity")
          .from("campaigns")
          .select("*")
          .eq("id", campaignId ?? "")
          .maybeSingle()
      ),
    queryKey: ["admin", "campaign", campaignId],
  });
  const partners = useQuery({
    queryFn: async () =>
      unwrap(await supabase.schema("governance").rpc("partner_names")) ?? [],
    queryKey: ["admin", "partner-names"],
  });
  useEffect(() => {
    const c = existing.data;
    if (c) {
      setForm({
        ...(Object.fromEntries(
          STAGE_DATES.map((k) => [k, c[k] ?? ""])
        ) as Record<StageDate, string>),
        ends_on: c.ends_on ?? "",
        partner_id: c.partner_id ?? "",
        programme_id: c.programme_id ?? "",
        slug: c.slug,
        starts_on: c.starts_on ?? "",
        status: c.status,
        summary: { ar: c.summary_ar ?? "", en: c.summary_en ?? "" },
        title: { ar: c.title_ar, en: c.title_en },
      });
      setPoints(charity.dropOffPoints(c.drop_off_points).map(newPoint));
    }
  }, [existing.data]);

  const save = useMutation({
    mutationFn: async () => {
      const row = {
        ...(Object.fromEntries(
          STAGE_DATES.map((k) => [k, form[k] || null])
        ) as Record<StageDate, string | null>),
        drop_off_points: points
          .filter((p) => p.place.en.trim() || p.place.ar.trim())
          .map((p) => ({
            place_ar: p.place.ar.trim(),
            place_en: p.place.en.trim(),
            ...(p.hours.en.trim() ? { hours_en: p.hours.en.trim() } : {}),
            ...(p.hours.ar.trim() ? { hours_ar: p.hours.ar.trim() } : {}),
          })),
        ends_on: form.ends_on || null,
        partner_id: form.partner_id || null,
        programme_id: form.programme_id || null,
        slug: form.slug || slugify(form.title.en),
        starts_on: form.starts_on || null,
        status: form.status,
        summary_ar: form.summary.ar || null,
        summary_en: form.summary.en || null,
        title_ar: form.title.ar,
        title_en: form.title.en,
      };
      const table = supabase.schema("charity").from("campaigns");
      if (campaignId) {
        unwrap(await table.update(row).eq("id", campaignId));
        return campaignId;
      }
      const created = unwrap(await table.insert(row).select("id").single());
      if (!created) {
        throw new Error("not_created");
      }
      return created.id;
    },
    onSuccess: async (savedId) => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      if (!campaignId) {
        router.replace(`/events/campaigns/${savedId}`);
      }
    },
  });

  if (campaignId && existing.isPending) {
    return <SectionSpinner />;
  }
  if (campaignId && !existing.data) {
    return (
      <p className="type-body text-text-secondary">{t("campaign.notFound")}</p>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <form className="grid max-w-4xl gap-6" onSubmit={submit}>
      <BilingualField
        label={t("campaign.titleField")}
        maxLength={200}
        onChange={(title) => setForm((f) => ({ ...f, title }))}
        required
        value={form.title}
      />
      <Field hint={tk("slugHint")} label={tk("slug")}>
        {(id) => (
          <Input
            dir="ltr"
            id={id}
            maxLength={80}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            placeholder={slugify(form.title.en)}
            value={form.slug}
          />
        )}
      </Field>
      <BilingualField
        label={t("campaign.summary")}
        maxLength={600}
        multiline
        onChange={(summary) => setForm((f) => ({ ...f, summary }))}
        rows={3}
        value={form.summary}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("campaign.partner")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({ ...f, partner_id: e.target.value }))
              }
              value={form.partner_id}
            >
              <option value="">{t("campaign.noPartner")}</option>
              {partners.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {localized(p, "name", locale)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={tk("programme")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({ ...f, programme_id: e.target.value }))
              }
              value={form.programme_id}
            >
              <option value="">{tk("noProgramme")}</option>
              {programmes.options.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={t("campaign.startsOn")}>
          {(id) => (
            <DateInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({ ...f, starts_on: e.target.value }))
              }
              value={form.starts_on}
            />
          )}
        </Field>
        <Field label={t("campaign.endsOn")}>
          {(id) => (
            <DateInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({ ...f, ends_on: e.target.value }))
              }
              value={form.ends_on}
            />
          )}
        </Field>
      </div>
      <fieldset className="grid gap-4">
        <legend className="type-subheading pb-2">
          {t("campaign.stagesTitle")}
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {STAGE_DATES.map((key) => (
            <Field key={key} label={t(`campaign.stageDates.${key}`)}>
              {(id) => (
                <DateInput
                  id={id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  value={form[key]}
                />
              )}
            </Field>
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-4">
        <legend className="type-subheading pb-2">
          {t("campaign.dropOffTitle")}
        </legend>
        {points.map((point, index) => (
          <div
            className="grid gap-4 border-line border-t pt-space-4"
            key={point.key}
          >
            <BilingualField
              label={t("campaign.dropOffPlace", { n: String(index + 1) })}
              maxLength={200}
              onChange={(place) =>
                setPoints((ps) =>
                  ps.map((p) => (p.key === point.key ? { ...p, place } : p))
                )
              }
              required
              value={point.place}
            />
            <BilingualField
              label={t("campaign.dropOffHours")}
              maxLength={200}
              onChange={(hours) =>
                setPoints((ps) =>
                  ps.map((p) => (p.key === point.key ? { ...p, hours } : p))
                )
              }
              value={point.hours}
            />
            <Button
              className="justify-self-start"
              onClick={() =>
                setPoints((ps) => ps.filter((p) => p.key !== point.key))
              }
              type="button"
              variant="link"
            >
              {t("campaign.dropOffRemove")}
            </Button>
          </div>
        ))}
        {points.length < 20 ? (
          <Button
            className="justify-self-start"
            onClick={() => setPoints((ps) => [...ps, newPoint()])}
            type="button"
            variant="link"
          >
            {t("campaign.dropOffAdd")}
          </Button>
        ) : null}
      </fieldset>
      <Field label={t("campaign.status")}>
        {(id) => (
          <SelectInput
            className="w-48"
            id={id}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            value={form.status}
          >
            {(["draft", "active", "closed"] as const).map((s) => (
              <option key={s} value={s}>
                {t(`statuses.${s}`)}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
      <SaveButton pending={save.isPending} success={save.isSuccess} />
      <ErrorLine error={save.error} />
    </form>
  );
};

// ── Handover ────────────────────────────────────────────────────────────────

/**
 * The witnessed handover (owner, Oct 30, 2026): the sealed collection is
 * handed to the charity partner with a witness and a receipt, and the day,
 * the amount, the witness and the receipt are kept on the campaign.
 */
const Handover = ({ campaignId }: { campaignId: string }) => {
  const t = useTranslations("diwan.admin.charity.handover");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["admin", "campaign", campaignId, "handover"];
  const data = useQuery({
    queryFn: async () => {
      const [campaign, receipts] = await Promise.all([
        supabase
          .schema("charity")
          .from("campaigns")
          .select(
            "handed_over_on, handed_over_iqd, handover_witness, handover_receipt_id, handover_note"
          )
          .eq("id", campaignId)
          .maybeSingle(),
        supabase
          .schema("charity")
          .from("receipts")
          .select("id, description_en, description_ar")
          .eq("campaign_id", campaignId)
          .order("created_at", { ascending: false }),
      ]);
      return { campaign: unwrap(campaign), receipts: unwrap(receipts) ?? [] };
    },
    queryKey,
  });
  const witnessNames = useMemberNames(
    data.data?.campaign?.handover_witness
      ? [data.data.campaign.handover_witness]
      : []
  );
  const [form, setForm] = useState<{
    amount: string;
    note: string;
    on: string;
    receipt: string;
    witness: {
      full_name_ar: string | null;
      full_name_en: string;
      id: string;
    } | null;
  } | null>(null);
  const current = data.data?.campaign;
  const savedWitness = witnessNames.data?.[0];
  const values = form ?? {
    amount:
      current?.handed_over_iqd === null ||
      current?.handed_over_iqd === undefined
        ? ""
        : String(current.handed_over_iqd),
    note: current?.handover_note ?? "",
    on: current?.handed_over_on ?? "",
    receipt: current?.handover_receipt_id ?? "",
    witness: savedWitness ?? null,
  };
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("charity")
          .from("campaigns")
          .update({
            handed_over_iqd: values.on ? Number(values.amount) : null,
            handed_over_on: values.on || null,
            handover_note: values.note.trim() || null,
            handover_receipt_id: values.receipt || null,
            handover_witness: values.witness?.id ?? null,
          })
          .eq("id", campaignId)
      ),
    onSuccess: async () => {
      setForm(null);
      await queryClient.invalidateQueries({ queryKey });
    },
  });
  const change = (patch: Partial<typeof values>) =>
    setForm({ ...values, ...patch });

  if (data.isPending) {
    return <SectionSpinner />;
  }

  return (
    <form
      className="grid max-w-3xl gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <p className="type-body text-text-secondary">{t("lede")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("on")}>
          {(id) => (
            <DateInput
              id={id}
              onChange={(e) => change({ on: e.target.value })}
              value={values.on}
            />
          )}
        </Field>
        <Field label={t("amount")}>
          {(id) => (
            <Input
              dir="ltr"
              id={id}
              inputMode="numeric"
              min={0}
              onChange={(e) => change({ amount: e.target.value })}
              required={Boolean(values.on)}
              type="number"
              value={values.amount}
            />
          )}
        </Field>
      </div>
      <MemberPicker
        label={t("witness")}
        onChange={(person) => change({ witness: person })}
        value={values.witness}
      />
      <Field label={t("receipt")}>
        {(id) => (
          <SelectInput
            id={id}
            onChange={(e) => change({ receipt: e.target.value })}
            value={values.receipt}
          >
            <option value="">{t("noReceipt")}</option>
            {data.data?.receipts.map((r) => (
              <option key={r.id} value={r.id}>
                {localized(r, "description", locale)}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
      <Field label={t("note")}>
        {(id) => (
          <Input
            id={id}
            maxLength={1000}
            onChange={(e) => change({ note: e.target.value })}
            value={values.note}
          />
        )}
      </Field>
      <SaveButton pending={save.isPending} success={save.isSuccess} />
      <ErrorLine error={save.error} />
    </form>
  );
};

// ── Ledger ──────────────────────────────────────────────────────────────────

const useLedger = (campaignId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => {
      const [entries, signoffs] = await Promise.all([
        supabase
          .schema("charity")
          .from("ledger_entries")
          .select(
            "id, occurred_on, amount_iqd, source, counted_by, counted_with, created_by, note, reverses_entry_id, created_at"
          )
          .eq("campaign_id", campaignId)
          .order("created_at", { ascending: false }),
        supabase
          .schema("charity")
          .from("ledger_signoffs")
          .select("entry_id, signed_by, signed_at"),
      ]);
      const signoffRows = unwrap(signoffs) ?? [];
      const entryRows = unwrap(entries) ?? [];
      return entryRows.map((e) => ({
        ...e,
        reversed: entryRows.some((other) => other.reverses_entry_id === e.id),
        signoff: signoffRows.find((s) => s.entry_id === e.id) ?? null,
      }));
    },
    queryKey: ["admin", "ledger", campaignId],
  });
};

type LedgerRow = NonNullable<ReturnType<typeof useLedger>["data"]>[number];

const Ledger = ({ campaignId, slug }: { campaignId: string; slug: string }) => {
  const t = useTranslations("diwan.admin.charity");
  const locale = useLocale() as Locale;
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const grants = useGrants();
  const canWrite = hasPermission(
    grants.data,
    "charity.ledger.write",
    "campaign",
    campaignId
  );
  const ledger = useLedger(campaignId);
  const names = useMemberNames(
    (ledger.data ?? []).flatMap((e) => [
      e.counted_by,
      e.counted_with,
      e.signoff?.signed_by,
    ])
  );
  const nameOf = (id: string | null | undefined) => {
    const p = names.data?.find((n) => n.id === id);
    return p ? memberName(p, locale) : "—";
  };
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin"] });

  const reverse = useMutation({
    mutationFn: async (entry: LedgerRow) =>
      unwrap(
        await supabase
          .schema("charity")
          .from("ledger_entries")
          .insert({
            amount_iqd: -entry.amount_iqd,
            campaign_id: campaignId,
            counted_by: user?.id ?? "",
            counted_with:
              entry.counted_by === user?.id
                ? entry.counted_with
                : entry.counted_by,
            note: t("ledger.reversal"),
            occurred_on: new Date().toISOString().slice(0, 10),
            reverses_entry_id: entry.id,
            source: entry.source,
          })
      ),
    onSuccess: invalidate,
  });

  const columns: Column<LedgerRow>[] = [
    {
      cell: (e) => formatLongDate(e.occurred_on, locale, true),
      className: "whitespace-nowrap",
      header: t("columns.date"),
      key: "date",
    },
    {
      cell: (e) => formatIqd(e.amount_iqd, locale),
      className: "whitespace-nowrap tabular-nums text-end",
      header: t("columns.amount"),
      key: "amount",
    },
    {
      cell: (e) => t(`sources.${e.source}`),
      header: t("columns.source"),
      key: "source",
    },
    {
      cell: (e) => `${nameOf(e.counted_by)} · ${nameOf(e.counted_with)}`,
      header: t("columns.countedBy"),
      key: "counted",
    },
    {
      cell: (e) =>
        e.signoff
          ? `${nameOf(e.signoff.signed_by)}, ${formatLongDate(e.signoff.signed_at, locale)}`
          : t("ledger.waiting"),
      header: t("columns.signedOff"),
      key: "signoff",
    },
    {
      cell: (e) =>
        e.reverses_entry_id ? t("ledger.reversal") : (e.note ?? ""),
      header: t("columns.note"),
      key: "note",
    },
    {
      cell: (e) => {
        if (e.reversed) {
          return t("ledger.reversed");
        }
        return canWrite && !e.reverses_entry_id ? (
          <ConfirmAction
            confirmLabel={t("ledger.reverse")}
            description={t("ledger.reverseConfirm", {
              amount: formatIqd(-e.amount_iqd, locale),
            })}
            disabled={reverse.isPending}
            onConfirm={() => reverse.mutate(e)}
            variant="ghost"
          >
            {t("ledger.reverse")}
          </ConfirmAction>
        ) : null;
      },
      header: "",
      key: "actions",
    },
  ];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="type-body text-text-secondary">{t("ledger.lede")}</p>
        <ExportButton
          fileName={`sal-ledger-${slug}.csv`}
          name="ledger"
          params={{ campaign_id: campaignId }}
        />
      </div>
      {ledger.isPending ? <SectionSpinner /> : null}
      {ledger.data ? (
        <DataTable columns={columns} rowKey={(e) => e.id} rows={ledger.data} />
      ) : null}
      {canWrite ? (
        <AddInPlace label={t("ledger.record")}>
          {(close) => <NewLedgerEntry campaignId={campaignId} onDone={close} />}
        </AddInPlace>
      ) : null}
      <ErrorLine error={reverse.error} />
    </div>
  );
};

/**
 * A new ledger entry, added in place under the ledger (owner, Nov 4,
 * 2026): counted by two, confirmed before it is recorded.
 */
const NewLedgerEntry = ({
  onDone,
  campaignId,
}: {
  /** Called once saved: closes the form in place. */
  readonly onDone: () => void;
  readonly campaignId: string;
}) => {
  const t = useTranslations("diwan.admin.charity");
  const locale = useLocale() as Locale;
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const me = useMemberNames([user?.id]);
  const [form, setForm] = useState({
    amount: "",
    counted_with: null as {
      full_name_ar: string | null;
      full_name_en: string;
      id: string;
    } | null,
    note: "",
    occurred_on: new Date().toISOString().slice(0, 10),
    source: "table_cash" as (typeof charity.ledgerSources)[number],
  });
  const [problem, setProblem] = useState<string | null>(null);

  const record = useMutation({
    mutationFn: async () => {
      const parsed = charity.ledgerEntrySchema.safeParse({
        amount_iqd: Number(form.amount),
        campaign_id: campaignId,
        counted_by: user?.id,
        counted_with: form.counted_with?.id,
        note: form.note.trim() || undefined,
        occurred_on: form.occurred_on,
        source: form.source,
      });
      if (!parsed.success) {
        const [issue] = parsed.error.issues;
        setProblem(
          issue?.message === "two_counters"
            ? t("ledger.twoCounters")
            : t("ledger.amountError")
        );
        throw new Error("invalid");
      }
      setProblem(null);
      unwrap(
        await supabase
          .schema("charity")
          .from("ledger_entries")
          .insert(parsed.data)
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      onDone();
    },
  });
  const submit = (event: FormEvent) => event.preventDefault();
  const myName = me.data?.[0] ? memberName(me.data[0], locale) : t("ledger.me");

  return (
    <form className="grid max-w-3xl gap-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("ledger.amount")}>
          {(id) => (
            <Input
              dir="ltr"
              id={id}
              inputMode="numeric"
              min={1}
              onChange={(e) =>
                setForm((f) => ({ ...f, amount: e.target.value }))
              }
              required
              type="number"
              value={form.amount}
            />
          )}
        </Field>
        <Field label={t("ledger.source")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  source: e.target
                    .value as (typeof charity.ledgerSources)[number],
                }))
              }
              value={form.source}
            >
              {charity.ledgerSources.map((s) => (
                <option key={s} value={s}>
                  {t(`sources.${s}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={t("ledger.occurredOn")}>
          {(id) => (
            <DateInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({ ...f, occurred_on: e.target.value }))
              }
              required
              value={form.occurred_on}
            />
          )}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <span className="font-medium text-sm">{t("ledger.countedBy")}</span>
          <span>{myName}</span>
          <span className="type-caption">{t("ledger.countedHint")}</span>
        </div>
        <MemberPicker
          excludeId={user?.id}
          label={t("ledger.countedWith")}
          onChange={(counted_with) => setForm((f) => ({ ...f, counted_with }))}
          value={form.counted_with}
        />
      </div>
      <Field label={t("ledger.note")}>
        {(id) => (
          <Input
            id={id}
            maxLength={1000}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            value={form.note}
          />
        )}
      </Field>
      {problem ? (
        <p className="text-sm text-text" role="alert">
          {problem}
        </p>
      ) : null}
      <div>
        <ConfirmAction
          confirmLabel={t("ledger.recordButton")}
          description={t("ledger.recordConfirm", {
            a: myName,
            amount: formatIqd(Number(form.amount) || 0, locale),
            b: form.counted_with ? memberName(form.counted_with, locale) : "—",
          })}
          disabled={!(form.amount && form.counted_with) || record.isPending}
          onConfirm={() => record.mutate()}
          variant="default"
        >
          {t("ledger.recordButton")}
        </ConfirmAction>
      </div>
      {record.error && record.error.message !== "invalid" ? (
        <ErrorLine error={record.error} />
      ) : null}
    </form>
  );
};

// ── Sign-off queue ──────────────────────────────────────────────────────────

const SignoffQueue = ({ campaignId }: { campaignId: string }) => {
  const t = useTranslations("diwan.admin.charity");
  const locale = useLocale() as Locale;
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const ledger = useLedger(campaignId);
  const waiting = (ledger.data ?? []).filter(
    (e) => !e.signoff && e.created_by !== user?.id
  );
  const names = useMemberNames(
    waiting.flatMap((e) => [e.created_by, e.counted_by, e.counted_with])
  );
  const nameOf = (id: string) => {
    const p = names.data?.find((n) => n.id === id);
    return p ? memberName(p, locale) : "—";
  };
  const sign = useMutation({
    mutationFn: async (entryId: string) =>
      unwrap(
        await supabase
          .schema("charity")
          .from("ledger_signoffs")
          .insert({ entry_id: entryId })
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin"] }),
  });

  if (ledger.isPending) {
    return <SectionSpinner />;
  }
  return (
    <div className="grid gap-4">
      <p className="type-body text-text-secondary">{t("signoff.lede")}</p>
      {waiting.length === 0 ? (
        <p className="type-body text-text-secondary">{t("signoff.empty")}</p>
      ) : null}
      <ul className="grid gap-3">
        {waiting.map((e) => (
          <li
            className="flex flex-wrap items-center justify-between gap-3 border-line border-b pb-3"
            key={e.id}
          >
            <div>
              <p className="font-medium tabular-nums">
                {formatIqd(e.amount_iqd, locale)} · {t(`sources.${e.source}`)}
              </p>
              <p className="type-caption">
                {formatLongDate(e.occurred_on, locale, true)} ·{" "}
                {`${nameOf(e.counted_by)} · ${nameOf(e.counted_with)}`} ·{" "}
                {t("signoff.recordedBy", { name: nameOf(e.created_by) })}
              </p>
              {e.note ? <p className="type-caption">{e.note}</p> : null}
            </div>
            <ConfirmAction
              confirmLabel={t("signoff.sign")}
              description={t("signoff.signConfirm", {
                amount: formatIqd(e.amount_iqd, locale),
              })}
              disabled={sign.isPending}
              onConfirm={() => sign.mutate(e.id)}
              variant="default"
            >
              {t("signoff.sign")}
            </ConfirmAction>
          </li>
        ))}
      </ul>
      <ErrorLine error={sign.error} />
    </div>
  );
};

// ── Receipts ────────────────────────────────────────────────────────────────

const Receipts = ({ campaignId }: { campaignId: string }) => {
  const t = useTranslations("diwan.admin.charity");
  const tm = useTranslations("diwan.admin.members");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const receipts = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("charity")
          .from("receipts")
          .select("*")
          .eq("campaign_id", campaignId)
          .order("created_at", { ascending: false })
      ) ?? [],
    queryKey: ["admin", "receipts", campaignId],
  });
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "receipts"] });

  const toggle = useMutation({
    mutationFn: async (receipt: { id: string; is_public: boolean }) =>
      unwrap(
        await supabase
          .schema("charity")
          .from("receipts")
          .update({ is_public: !receipt.is_public })
          .eq("id", receipt.id)
      ),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (receipt: { id: string; storage_path: string }) => {
      await removeFiles(supabase, "receipts", [receipt.storage_path]);
      unwrap(
        await supabase
          .schema("charity")
          .from("receipts")
          .delete()
          .eq("id", receipt.id)
      );
    },
    onSuccess: invalidate,
  });
  const view = async (receiptId: string) => {
    const { url } = await callApi<{ url: string }>(supabase, "/files/receipt", {
      id: receiptId,
    });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  type Row = NonNullable<typeof receipts.data>[number];
  const columns: Column<Row>[] = [
    {
      cell: (r) => localized(r, "description", locale),
      header: t("columns.description"),
      key: "description",
    },
    {
      cell: (r) => (r.amount_iqd ? formatIqd(r.amount_iqd, locale) : "—"),
      className: "whitespace-nowrap tabular-nums",
      header: t("columns.amount"),
      key: "amount",
    },
    {
      cell: (r) => (r.is_public ? tm("yes") : tm("no")),
      header: t("columns.public"),
      key: "public",
    },
    {
      cell: (r) => (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => view(r.id)}
            size="sm"
            type="button"
            variant="outline"
          >
            {t("receipts.view")}
          </Button>
          <Button
            disabled={toggle.isPending}
            onClick={() => toggle.mutate(r)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {r.is_public ? t("receipts.makePrivate") : t("receipts.makePublic")}
          </Button>
          <ConfirmAction
            confirmLabel={t("receipts.remove")}
            description={t("receipts.removeConfirm")}
            disabled={remove.isPending}
            onConfirm={() => remove.mutate(r)}
            variant="ghost"
          >
            {t("receipts.remove")}
          </ConfirmAction>
        </div>
      ),
      header: "",
      key: "actions",
    },
  ];

  return (
    <div className="grid gap-6">
      <p className="type-body text-text-secondary">{t("receipts.lede")}</p>
      {receipts.data ? (
        <DataTable
          columns={columns}
          rowKey={(r) => r.id}
          rows={receipts.data}
        />
      ) : null}
      <AddInPlace label={t("receipts.upload")}>
        {(close) => <NewReceipt campaignId={campaignId} onDone={close} />}
      </AddInPlace>
      <ErrorLine error={toggle.error ?? remove.error} />
    </div>
  );
};

// ── Impact ──────────────────────────────────────────────────────────────────

const Impact = ({ campaignId }: { campaignId: string }) => {
  const t = useTranslations("diwan.admin.charity.impact");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const metrics = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("charity")
          .from("impact_metrics")
          .select("*")
          .eq("campaign_id", campaignId)
          .order("sort")
      ) ?? [],
    queryKey: ["admin", "impact", campaignId],
  });
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "impact"] });
  const publish = useMutation({
    mutationFn: async (metric: { id: string; published_at: string | null }) =>
      unwrap(
        await supabase
          .schema("charity")
          .from("impact_metrics")
          .update({
            published_at: metric.published_at ? null : new Date().toISOString(),
          })
          .eq("id", metric.id)
      ),
    onSuccess: invalidate,
  });

  return (
    <div className="grid gap-6">
      <p className="type-body text-text-secondary">{t("lede")}</p>
      <ul className="grid gap-3">
        {metrics.data?.map((m) => (
          <li
            className="flex flex-wrap items-center justify-between gap-3 border-line border-b pb-3"
            key={m.id}
          >
            <div>
              <p className="font-medium">
                {formatNumber(m.value)} {localized(m, "unit", locale)}
              </p>
              <p className="type-caption">{localized(m, "label", locale)}</p>
            </div>
            <div className="flex items-center gap-3">
              {m.published_at ? (
                <span className="type-caption">{t("published")}</span>
              ) : null}
              <ConfirmAction
                confirmLabel={m.published_at ? t("unpublish") : t("publish")}
                description={localized(m, "label", locale)}
                disabled={publish.isPending}
                onConfirm={() => publish.mutate(m)}
              >
                {m.published_at ? t("unpublish") : t("publish")}
              </ConfirmAction>
            </div>
          </li>
        ))}
      </ul>
      <AddInPlace label={t("add")}>
        {(close) => <NewImpact campaignId={campaignId} onDone={close} />}
      </AddInPlace>
      <ErrorLine error={publish.error} />
    </div>
  );
};

/** A new receipt, uploaded in place under Receipts. */
const NewReceipt = ({
  onDone,
  campaignId,
}: {
  /** Called once saved: closes the form in place. */
  readonly onDone: () => void;
  readonly campaignId: string;
}) => {
  const t = useTranslations("diwan.admin.charity");
  const id = useId();
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    amount: "",
    description: { ar: "", en: "" },
    is_public: false,
  });
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "receipts"] });
  const upload = useMutation({
    mutationFn: async () => {
      if (!file) {
        return;
      }
      const stored = await uploadReceipt(supabase, campaignId, file);
      unwrap(
        await supabase
          .schema("charity")
          .from("receipts")
          .insert({
            amount_iqd: form.amount ? Number(form.amount) : null,
            campaign_id: campaignId,
            description_ar: form.description.ar || null,
            description_en: form.description.en,
            is_public: form.is_public,
            storage_path: stored.path,
          })
      );
    },
    onSuccess: async () => {
      await invalidate();
      onDone();
    },
  });
  return (
    <form
      className="grid max-w-3xl gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        upload.mutate();
      }}
    >
      <Field hint={t("receipts.noPhotos")} label={t("receipts.file")}>
        {(fieldId) => (
          <FileInput
            accept="application/pdf,image/jpeg,image/png"
            id={fieldId}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        )}
      </Field>
      <BilingualField
        label={t("receipts.description")}
        maxLength={300}
        onChange={(description) => setForm((f) => ({ ...f, description }))}
        value={form.description}
      />
      <Field label={t("receipts.amount")}>
        {(fieldId) => (
          <Input
            className="w-48"
            dir="ltr"
            id={fieldId}
            inputMode="numeric"
            min={1}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            type="number"
            value={form.amount}
          />
        )}
      </Field>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={form.is_public}
          id={`${id}-public`}
          onCheckedChange={(v) =>
            setForm((f) => ({ ...f, is_public: v === true }))
          }
        />
        <Label htmlFor={`${id}-public`}>{t("receipts.public")}</Label>
      </div>
      <SaveButton
        disabled={!(file && form.description.en.trim())}
        pending={upload.isPending}
      />
      <ErrorLine error={upload.error} />
    </form>
  );
};

/** A new impact figure, added in place under Impact. */
const NewImpact = ({
  onDone,
  campaignId,
}: {
  /** Called once saved: closes the form in place. */
  readonly onDone: () => void;
  readonly campaignId: string;
}) => {
  const t = useTranslations("diwan.admin.charity.impact");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    label: { ar: "", en: "" },
    report: { ar: "", en: "" },
    unit: { ar: "", en: "" },
    value: "",
  });
  const metrics = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("charity")
          .from("impact_metrics")
          .select("*")
          .eq("campaign_id", campaignId)
          .order("sort")
      ) ?? [],
    queryKey: ["admin", "impact", campaignId],
  });
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "impact"] });
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("charity")
          .from("impact_metrics")
          .insert({
            campaign_id: campaignId,
            label_ar: form.label.ar,
            label_en: form.label.en,
            report_ar: form.report.ar || null,
            report_en: form.report.en || null,
            sort: metrics.data?.length ?? 0,
            unit_ar: form.unit.ar || null,
            unit_en: form.unit.en || null,
            value: Number(form.value),
          })
      ),
    onSuccess: async () => {
      await invalidate();
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
      <BilingualField
        label={t("label")}
        maxLength={200}
        onChange={(label) => setForm((f) => ({ ...f, label }))}
        required
        value={form.label}
      />
      <Field label={t("value")}>
        {(id) => (
          <Input
            className="w-48"
            dir="ltr"
            id={id}
            inputMode="decimal"
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            required
            type="number"
            value={form.value}
          />
        )}
      </Field>
      <BilingualField
        label={t("unit")}
        maxLength={60}
        onChange={(unit) => setForm((f) => ({ ...f, unit }))}
        value={form.unit}
      />
      <BilingualField
        label={t("report")}
        multiline
        onChange={(report) => setForm((f) => ({ ...f, report }))}
        rows={4}
        value={form.report}
      />
      <SaveButton pending={add.isPending} />
      <ErrorLine error={add.error} />
    </form>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────

export const CampaignAdmin = ({
  tab = "ledger",
}: {
  readonly tab?: CampaignTab;
}) => {
  const t = useTranslations("diwan.admin.charity");
  const tk = useTranslations("diwan.admin.kit");
  const locale = useLocale() as Locale;
  const campaignId = useQueryParam("id");
  const { supabase, user } = useAuth();
  const grants = useGrants();
  const campaign = useQuery({
    enabled: Boolean(campaignId),
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("charity")
          .from("campaigns")
          .select("id, slug, title_en, title_ar")
          .eq("id", campaignId ?? "")
          .maybeSingle()
      ),
    queryKey: ["admin", "campaign-head", campaignId],
  });
  const ledger = useQuery({
    enabled: Boolean(campaignId),
    queryFn: async () => {
      const entries =
        unwrap(
          await supabase
            .schema("charity")
            .from("ledger_entries")
            .select("id, created_by")
            .eq("campaign_id", campaignId ?? "")
        ) ?? [];
      const signoffs =
        unwrap(
          await supabase
            .schema("charity")
            .from("ledger_signoffs")
            .select("entry_id")
        ) ?? [];
      return entries.filter(
        (e) =>
          e.created_by !== user?.id &&
          !signoffs.some((s) => s.entry_id === e.id)
      ).length;
    },
    queryKey: ["admin", "ledger-waiting", campaignId],
  });

  const back = (
    <Link
      className="text-sm underline underline-offset-4"
      href="/events/campaigns"
    >
      {tk("back")}
    </Link>
  );

  if (!campaignId) {
    return (
      <div className="grid gap-8">
        <AdminHeading actions={back} title={t("newCampaign")} />
        <CampaignSettings campaignId={null} />
      </div>
    );
  }
  if (campaign.isPending) {
    return <SectionSpinner />;
  }
  if (campaign.isError) {
    return <ErrorState onRetry={() => campaign.refetch()} />;
  }
  if (!campaign.data) {
    return (
      <p className="type-body text-text-secondary">{t("campaign.notFound")}</p>
    );
  }

  const can = (
    permission:
      | "charity.manage"
      | "charity.ledger.write"
      | "charity.ledger.signoff"
  ) => hasPermission(grants.data, permission, "campaign", campaignId);
  const canManage = can("charity.manage");
  const canSign = can("charity.ledger.signoff");
  const base = `/events/campaigns/${campaign.data.slug}`;
  const pathOf = (key: CampaignTab) =>
    key === "ledger" ? base : `${base}/${key}`;
  const tabs = campaignTabs.filter((key) => {
    if (key === "ledger") {
      return true;
    }
    return key === "signoff" ? canSign : canManage;
  });
  const shown = tabs.find((key) => key === tab) ?? "ledger";
  const title = localized(campaign.data, "title", locale);
  const labelOf = (key: CampaignTab) =>
    key === "signoff"
      ? t("tabs.signoff", { count: formatNumber(ledger.data ?? 0) })
      : t(`tabs.${key}`);

  return (
    <div className="grid gap-8">
      <AdminHeading actions={back} title={title} />
      <SectionTabs
        label={title}
        tabs={tabs.map((key) => ({ href: pathOf(key), label: labelOf(key) }))}
      />
      <div className="pt-2">
        {shown === "ledger" ? (
          <Ledger campaignId={campaignId} slug={campaign.data.slug} />
        ) : null}
        {shown === "signoff" ? <SignoffQueue campaignId={campaignId} /> : null}
        {shown === "settings" ? (
          <CampaignSettings campaignId={campaignId} />
        ) : null}
        {shown === "catalog" ? (
          <CampaignCatalog campaignId={campaignId} />
        ) : null}
        {shown === "receipts" ? <Receipts campaignId={campaignId} /> : null}
        {shown === "handover" ? <Handover campaignId={campaignId} /> : null}
        {shown === "impact" ? <Impact campaignId={campaignId} /> : null}
      </div>
      {shown === "settings" ? (
        <RecordHistory id={campaignId} table="charity.campaigns" />
      ) : null}
    </div>
  );
};
