"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import type { Locale } from "@repo/internationalization";
import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link as SiteLink } from "@repo/internationalization/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { recognition, unwrap } from "@/lib/data";
import { useRouter } from "@/lib/diwan/navigation";
import { useGrants } from "@/lib/diwan/queries";
import { hasPermissionAnywhere } from "@/lib/rbac";
import { SectionSpinner } from "../../states";
import { SectionTabs } from "../admin-shell";
import {
  AdminHeading,
  BilingualField,
  type Column,
  ConfirmAction,
  DataTable,
  ErrorLine,
  Field,
  NewLink,
  RecordPage,
  SaveButton,
  SelectInput,
} from "../kit";
import { MemberPicker, useMemberNames } from "../member-picker";
import { memberName } from "../members/directory";
import { SelectableTable } from "../selectable-table";
import { type ServiceTab, serviceTabs } from "../tabs";
import { ServiceLetters } from "./letters";

const key = ["admin", "recognition"];

type CertificateStatus = "draft" | "issued" | "revoked";

// ── Hours to confirm ────────────────────────────────────────────────────────

interface PendingRow {
  activity: string;
  hours: number;
  id: string;
  occurred_on: string;
  user_id: string;
  what: string | null;
}

const PendingHours = () => {
  const t = useTranslations("diwan.admin.recognition.pending");
  const tk = useTranslations("diwan.admin.kit.selection");
  const locale = useLocale() as Locale;
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState<{
    id: string;
    reason: string;
  } | null>(null);
  const pending = useQuery({
    queryFn: async () =>
      (unwrap(
        await supabase
          .schema("membership")
          .from("service_records")
          .select("id, user_id, occurred_on, activity, what, hours")
          .eq("status", "pending")
          .neq("user_id", user?.id ?? "")
          .order("occurred_on")
      ) ?? []) as PendingRow[],
    queryKey: [...key, "pending"],
  });
  const rows = pending.data ?? [];
  const names = useMemberNames(rows.map((r) => r.user_id));
  const decide = useMutation({
    mutationFn: ({
      approve,
      id,
      reason,
    }: {
      approve: boolean;
      id: string;
      reason?: string;
    }) => recognition.confirmService(supabase, id, approve, reason),
    onSuccess: async () => {
      setRejecting(null);
      await queryClient.invalidateQueries({ queryKey: key });
    },
  });
  const nameOf = (id: string) => {
    const row = names.data?.find((n) => n.id === id);
    return row ? memberName(row, locale) : "";
  };
  // A40: confirm many at once; each is still confirmed by the database.
  const confirmAll = useMutation({
    mutationFn: async (ids: readonly string[]) => {
      await Promise.all(
        ids.map((id) => recognition.confirmService(supabase, id, true))
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const actions = (row: PendingRow) => {
    if (rejecting?.id === row.id) {
      return (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            decide.mutate({
              approve: false,
              id: row.id,
              reason: rejecting.reason,
            });
          }}
        >
          <Input
            aria-label={t("reason")}
            className="max-w-48"
            dir="auto"
            maxLength={500}
            onChange={(e) =>
              setRejecting({ id: row.id, reason: e.target.value })
            }
            placeholder={t("reason")}
            value={rejecting.reason}
          />
          <Button disabled={decide.isPending} size="sm" type="submit">
            {t("reject")}
          </Button>
        </form>
      );
    }
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={decide.isPending}
          onClick={() => decide.mutate({ approve: true, id: row.id })}
          size="sm"
        >
          {t("confirm")}
        </Button>
        <Button
          onClick={() => setRejecting({ id: row.id, reason: "" })}
          size="sm"
          variant="outline"
        >
          {t("reject")}
        </Button>
      </div>
    );
  };

  const columns: Column<PendingRow>[] = [
    { cell: (row) => nameOf(row.user_id), header: t("person"), key: "person" },
    {
      cell: (row) => formatLongDate(row.occurred_on, locale, true),
      header: t("date"),
      key: "date",
    },
    {
      cell: (row) => (
        <div className="grid" dir="auto">
          <span className="font-medium">{row.activity}</span>
          {row.what ? <span className="type-caption">{row.what}</span> : null}
        </div>
      ),
      header: t("activity"),
      key: "activity",
    },
    {
      cell: (row) => formatNumber(Number(row.hours)),
      header: t("hours"),
      key: "hours",
    },
    { cell: actions, header: "", key: "actions" },
  ];

  if (pending.isPending) {
    return <SectionSpinner />;
  }
  return (
    <div className="grid gap-4">
      <p className="type-body">{t("lede")}</p>
      <ErrorLine error={decide.error ?? confirmAll.error} />
      <SelectableTable
        actions={(chosen, clear) => (
          <Button
            disabled={confirmAll.isPending}
            onClick={() =>
              confirmAll.mutate(
                chosen.map((row) => row.id),
                { onSuccess: clear }
              )
            }
            size="sm"
          >
            {t("confirmChosen", { count: formatNumber(chosen.length) })}
          </Button>
        )}
        columns={columns}
        empty={t("empty")}
        label={(row) => tk("row", { name: nameOf(row.user_id) })}
        rowKey={(row) => row.id}
        rows={rows}
      />
    </div>
  );
};

// ── Totals ──────────────────────────────────────────────────────────────────

const Totals = () => {
  const t = useTranslations("diwan.admin.recognition.totals");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const totals = useQuery({
    queryFn: () => recognition.serviceTotals(supabase),
    queryKey: [...key, "totals"],
  });
  type Row = Awaited<ReturnType<typeof recognition.serviceTotals>>[number];
  const columns: Column<Row>[] = [
    {
      cell: (row) => memberName(row, locale),
      header: t("person"),
      key: "person",
    },
    {
      cell: (row) => formatNumber(Number(row.hours)),
      header: t("hours"),
      key: "hours",
    },
  ];
  if (totals.isPending) {
    return <SectionSpinner />;
  }
  return (
    <div className="grid gap-4">
      <p className="type-body">{t("lede")}</p>
      <DataTable
        columns={columns}
        empty={t("empty")}
        rowKey={(row) => row.user_id}
        rows={totals.data ?? []}
      />
    </div>
  );
};

// ── Certificates ────────────────────────────────────────────────────────────

interface CertificateRow {
  first_signed_by: string | null;
  id: string;
  issued_at: string | null;
  kind: string;
  lang: string;
  prize_category: string | null;
  qalam_student_id: string | null;
  second_signed_by: string | null;
  serial: string | null;
  status: string;
  user_id: string | null;
}

type PrizeCategory = (typeof recognition.prizeCategories)[number];
type CertificateLang = (typeof recognition.certificateLanguages)[number];

const emptyForm = {
  category: "qirtas" as PrizeCategory,
  citation: { ar: "", en: "" },
  kind: "prize" as recognition.CertificateKind,
  lang: "en" as CertificateLang,
  student: "",
};

/** Qalam's students who finished, newest summer first (staff only). */
const useFinishedStudents = (enabled: boolean) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled,
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("qalam_students")
          .select("id, first_name, last_name, school, year")
          .in("status", ["accepted", "finished"])
          .order("year", { ascending: false })
          .order("last_name")
      ) ?? [],
    queryKey: [...key, "qalam-students"],
  });
};

/**
 * Drafting a certificate (decisions.md: only for finishing Qalam and
 * for the Mutanabbi Prize, each category): the Prize's names a member, its
 * category and its citation; Qalam's names a student from the roster
 * (students have no accounts). Each is in one language, the one its
 * recipient chose. Signers: Qalam, the Qalam lead and the Editor-in-Chief;
 * the Prize, the Editor-in-Chief and the President.
 */
const PrepareForm = ({ onDone }: { onDone: () => void }) => {
  const t = useTranslations("diwan.admin.recognition.certificates");
  const tc = useTranslations("diwan.admin.recognition.certificates.kinds");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [person, setPerson] = useState<{
    full_name_ar: string | null;
    full_name_en: string;
    id: string;
  } | null>(null);
  const [form, setForm] = useState(emptyForm);
  const students = useFinishedStudents(form.kind === "qalam");
  const save = useMutation({
    mutationFn: async () => {
      const row = recognition.certificateSchema.parse({
        citation_ar: form.kind === "prize" ? form.citation.ar : null,
        citation_en: form.kind === "prize" ? form.citation.en : null,
        kind: form.kind,
        lang: form.lang,
        prize_category: form.kind === "prize" ? form.category : null,
        qalam_student_id: form.kind === "qalam" ? form.student : null,
        user_id: form.kind === "prize" ? (person?.id ?? null) : null,
      });
      unwrap(
        await supabase.schema("membership").from("certificates").insert(row)
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key });
      onDone();
    },
  });
  const copy = recognition.certificateCopy[locale === "ar" ? "ar" : "en"];

  return (
    <form
      className="grid max-w-3xl gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <Field label={t("kind")}>
        {(id) => (
          <SelectInput
            id={id}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                kind: e.target.value as recognition.CertificateKind,
              }))
            }
            value={form.kind}
          >
            {recognition.certificateKinds.map((kind) => (
              <option key={kind} value={kind}>
                {tc(kind)}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
      <p className="type-caption">{t(`hints.${form.kind}`)}</p>
      {form.kind === "prize" ? (
        <>
          <MemberPicker
            label={t("holder")}
            onChange={setPerson}
            value={person}
          />
          <Field label={t("category")}>
            {(id) => (
              <SelectInput
                id={id}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    category: e.target.value as PrizeCategory,
                  }))
                }
                value={form.category}
              >
                {recognition.prizeCategories.map((category) => (
                  <option key={category} value={category}>
                    {copy.categories[category]}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <BilingualField
            label={t("citation")}
            maxLength={500}
            onChange={(citation) => setForm((f) => ({ ...f, citation }))}
            value={form.citation}
          />
        </>
      ) : (
        <Field label={t("student")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({ ...f, student: e.target.value }))
              }
              value={form.student}
            >
              {(students.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {`${s.first_name} ${s.last_name} · ${s.school} · ${s.year}`}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
      )}
      <Field hint={t("languageHint")} label={t("language")}>
        {(id) => (
          <SelectInput
            id={id}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                lang: e.target.value as CertificateLang,
              }))
            }
            value={form.lang}
          >
            {recognition.certificateLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {t(`languages.${lang}`)}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
      <div className="flex flex-wrap gap-2">
        <SaveButton
          disabled={
            form.kind === "prize"
              ? !(
                  person &&
                  (form.citation.en.trim() || form.citation.ar.trim())
                )
              : !form.student
          }
          pending={save.isPending}
        />
        <Button onClick={onDone} type="button" variant="ghost">
          {t("cancel")}
        </Button>
      </div>
      <ErrorLine error={save.error} />
    </form>
  );
};

const Certificates = () => {
  const t = useTranslations("diwan.admin.recognition.certificates");
  const tc = useTranslations("diwan.admin.recognition.certificates.kinds");
  const locale = useLocale() as Locale;
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const grants = useGrants();
  const canPrepare = hasPermissionAnywhere(grants.data, "certificates.prepare");
  const canSign = hasPermissionAnywhere(grants.data, "certificates.sign");
  const [revoking, setRevoking] = useState<{
    id: string;
    reason: string;
  } | null>(null);
  const certificates = useQuery({
    queryFn: async () =>
      (unwrap(
        await supabase
          .schema("membership")
          .from("certificates")
          .select(
            "id, user_id, qalam_student_id, kind, lang, prize_category, status, serial, issued_at, first_signed_by, second_signed_by"
          )
          .order("created_at", { ascending: false })
      ) ?? []) as CertificateRow[],
    queryKey: [...key, "certificates"],
  });
  const rows = certificates.data ?? [];
  const names = useMemberNames(
    rows.map((r) => r.user_id).filter((id): id is string => Boolean(id))
  );
  const students = useFinishedStudents(
    rows.some((r) => r.qalam_student_id !== null)
  );
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const sign = useMutation({
    mutationFn: (id: string) => recognition.signCertificate(supabase, id),
    onSuccess: invalidate,
  });
  const revoke = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      recognition.revokeCertificate(supabase, id, reason),
    onSuccess: async () => {
      setRevoking(null);
      await invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await supabase
          .schema("membership")
          .from("certificates")
          .delete()
          .eq("id", id)
      ),
    onSuccess: invalidate,
  });
  const copy = recognition.certificateCopy[locale === "ar" ? "ar" : "en"];
  const nameOf = (row: CertificateRow) => {
    if (row.qalam_student_id) {
      const s = students.data?.find((x) => x.id === row.qalam_student_id);
      return s ? `${s.first_name} ${s.last_name}` : "";
    }
    const member = names.data?.find((n) => n.id === row.user_id);
    return member ? memberName(member, locale) : "";
  };
  const roles = (row: CertificateRow) =>
    recognition.certificateSigners[row.kind as recognition.CertificateKind];
  // The database decides who may sign which slot; the button shows to any
  // signer while a slot is open and it isn't their own certificate.
  const mySignatureDue = (row: CertificateRow) =>
    canSign &&
    row.status === "draft" &&
    row.user_id !== user?.id &&
    !(row.first_signed_by && row.second_signed_by) &&
    row.first_signed_by !== user?.id;

  const signatures = (row: CertificateRow) => {
    if (row.status !== "draft") {
      return row.issued_at ? formatLongDate(row.issued_at, locale, true) : "";
    }
    const [first, second] = roles(row);
    const done = [
      row.first_signed_by ? t("signedBy", { role: copy.roles[first] }) : null,
      row.second_signed_by ? t("signedBy", { role: copy.roles[second] }) : null,
    ].filter(Boolean);
    return done.length > 0 ? done.join(" · ") : t("unsigned");
  };

  const actions = (row: CertificateRow) => {
    if (revoking?.id === row.id) {
      return (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            revoke.mutate(revoking);
          }}
        >
          <Input
            aria-label={t("revokeReason")}
            className="max-w-48"
            dir="auto"
            onChange={(e) =>
              setRevoking({ id: row.id, reason: e.target.value })
            }
            placeholder={t("revokeReason")}
            required
            value={revoking.reason}
          />
          <Button disabled={revoke.isPending} size="sm" type="submit">
            {t("revoke")}
          </Button>
        </form>
      );
    }
    return (
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <SiteLink href={`/account/record/certificates/${row.id}`}>
            {t("open")}
          </SiteLink>
        </Button>
        {mySignatureDue(row) ? (
          <Button
            disabled={sign.isPending}
            onClick={() => sign.mutate(row.id)}
            size="sm"
          >
            {t("sign")}
          </Button>
        ) : null}
        {row.status === "issued" && canSign ? (
          <Button
            onClick={() => setRevoking({ id: row.id, reason: "" })}
            size="sm"
            variant="ghost"
          >
            {t("revoke")}
          </Button>
        ) : null}
        {row.status === "draft" && canPrepare ? (
          <ConfirmAction
            confirmLabel={t("delete")}
            description={t("deleteConfirm")}
            onConfirm={() => remove.mutate(row.id)}
            variant="ghost"
          >
            {t("delete")}
          </ConfirmAction>
        ) : null}
      </div>
    );
  };

  const columns: Column<CertificateRow>[] = [
    { cell: nameOf, header: t("holder"), key: "holder" },
    {
      cell: (row) => (
        <div className="grid">
          <span>{tc(row.kind as recognition.CertificateKind)}</span>
          {row.prize_category ? (
            <span className="type-caption">
              {copy.categories[row.prize_category as PrizeCategory]}
            </span>
          ) : null}
        </div>
      ),
      header: t("kind"),
      key: "kind",
    },
    {
      cell: (row) => <span dir="ltr">{row.serial ?? t("statuses.draft")}</span>,
      header: t("serial"),
      key: "serial",
    },
    {
      cell: (row) => t(`statuses.${row.status as CertificateStatus}`),
      header: t("status"),
      key: "status",
    },
    { cell: signatures, header: t("signatures"), key: "signatures" },
    { cell: actions, header: "", key: "actions" },
  ];

  if (certificates.isPending) {
    return <SectionSpinner />;
  }
  return (
    <div className="grid gap-6">
      <p className="type-body">{t("lede")}</p>
      {canPrepare ? (
        <NewLink href="/qirtas/certificates/new">{t("prepare")}</NewLink>
      ) : null}
      <ErrorLine error={sign.error ?? revoke.error ?? remove.error} />
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

/** A certificate drafted on its own page under Certificates. */
export const NewCertificate = () => {
  const t = useTranslations("diwan.admin.recognition");
  const router = useRouter();
  const back = "/qirtas/certificates";
  return (
    <RecordPage
      back={back}
      backLabel={t("tabs.certificates")}
      title={t("certificates.prepare")}
    >
      <PrepareForm onDone={() => router.push(back)} />
    </RecordPage>
  );
};

/**
 * Qirtas → Certificates (decisions §6): the two certificates, finishing
 * Qalam and the Mutanabbi Prize, prepared, signed and countersigned.
 */
export const CertificatesAdmin = () => {
  const t = useTranslations("diwan.admin.recognition");
  return (
    <div className="grid gap-6">
      <AdminHeading title={t("tabs.certificates")} />
      <Certificates />
    </div>
  );
};

const servicePaths: Record<ServiceTab, string> = {
  letters: "/membership/service/letters",
  pending: "/membership/service",
  totals: "/membership/service/totals",
};

export const RecognitionAdmin = ({
  tab = "pending",
}: {
  readonly tab?: ServiceTab;
}) => {
  const t = useTranslations("diwan.admin.recognition");
  const grants = useGrants();
  const canConfirm =
    hasPermissionAnywhere(grants.data, "members.manage") ||
    hasPermissionAnywhere(grants.data, "programs.manage");
  const canTotals = hasPermissionAnywhere(grants.data, "members.manage");
  const allowed = serviceTabs.filter(
    (view) =>
      (view === "pending" && canConfirm) ||
      ((view === "totals" || view === "letters") && canTotals)
  );
  const shown = allowed.find((view) => view === tab) ?? allowed[0];

  return (
    <div className="grid gap-6">
      <AdminHeading title={t("title")}>{t("lede")}</AdminHeading>
      <SectionTabs
        label={t("title")}
        tabs={allowed.map((view) => ({
          href: servicePaths[view],
          label: t(`tabs.${view}`),
        }))}
      />
      <div className="pt-2">
        {shown === "pending" ? <PendingHours /> : null}
        {shown === "totals" ? <Totals /> : null}
        {shown === "letters" ? <ServiceLetters /> : null}
      </div>
    </div>
  );
};
