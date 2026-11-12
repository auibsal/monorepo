"use client";

import { Button } from "@repo/brand/components/ui/button";
import type { Tables } from "@repo/database/types";
import { type Locale, siteUrl } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { InlineConfirm } from "@/components/frame/inline-confirm";
import { Signature } from "@/components/signature";
import { useAuth } from "@/lib/auth/provider";
import { forms, unwrap } from "@/lib/data";
import { useQueryParam } from "@/lib/diwan/use-query-param";
import { useMemberNames } from "../admin/member-picker";
import { memberName } from "../admin/members/directory";
import { EmptyLine, SectionSpinner } from "../states";
import { FormValues, useFormLabels } from "./field";
import { kindTitle, useFormTypes } from "./forms";

/**
 * The signatures, drawn as on the memorandum of partnership: the signer's,
 * and the countersignature where there is one (a handover). A sealed
 * concern shows none.
 */
const Signatures = ({ submission }: { submission: Submission }) => {
  const t = useTranslations("diwan.forms");
  if (!(submission.signer_name && submission.signed_at)) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-x-10 gap-y-4">
      <Signature
        date={submission.signed_at}
        label={t("signedBy")}
        name={submission.signer_name}
      />
      {submission.second_signer_name && submission.second_signed_at ? (
        <Signature
          date={submission.second_signed_at}
          label={t("countersignedBy")}
          name={submission.second_signer_name}
        />
      ) : null}
    </div>
  );
};

/** The form's own label, else the kind's title from the database. */
const SheetTitle = ({
  formKey,
  label,
}: {
  readonly formKey: string;
  readonly label: string;
}) => {
  const locale = useLocale();
  const types = useFormTypes();
  return (
    <>
      {label ||
        kindTitle(
          types.data?.find((k) => k.key === formKey),
          locale
        ) ||
        formKey}
    </>
  );
};

export type Submission = Tables<{ schema: "governance" }, "form_submissions">;

const addDays = (iso: string, days: number) =>
  new Date(new Date(iso).getTime() + days * 864e5).toISOString();

/** The signing's record number and where anyone can check it. */
const RecordLine = ({ submission }: { submission: Submission }) => {
  const t = useTranslations("diwan.forms");
  const locale = useLocale() as Locale;
  if (!submission.reference) {
    return null;
  }
  return (
    <p className="type-caption">
      {t("recordNumber", {
        kind: submission.form_key,
        reference: submission.reference,
        version: String(submission.form_version),
      })}
      {submission.verification_code ? (
        <>
          {" · "}
          {t("checkAt")}{" "}
          <bdi dir="ltr">
            {siteUrl(locale, `/verify/${submission.verification_code}`)}
          </bdi>
        </>
      ) : null}
    </p>
  );
};

/**
 * A submitted form laid out for reading and printing (light paper, like
 * the printed form), with who sent it, when, and its answer dates.
 */
export const SubmissionSheet = ({
  actions,
  submission,
}: {
  actions?: ReactNode;
  submission: Submission;
}) => {
  const t = useTranslations("diwan.forms");
  const locale = useLocale() as Locale;
  const key = submission.form_key as forms.FormKey;
  // Kinds signed on their own page (the Code of Conduct, a role agreement)
  // have no fields here: their copy is the record line and the signature.
  const definition = forms.forms[key] as forms.FormDefinition | undefined;
  const labels = useFormLabels(key);
  const types = useFormTypes();
  const names = useMemberNames([
    submission.submitted_by,
    submission.subject_user_id,
  ]);
  const nameOf = (id: string | null) => {
    const row = names.data?.find((p) => p.id === id);
    return row ? memberName(row, locale) : "";
  };
  const type = types.data?.find((ty) => ty.key === key);
  const open = submission.status !== "closed" && submission.submitted_at;

  return (
    <article
      className="bg-surface text-text grid gap-6 p-6 print:p-0"
      data-theme="light"
    >
      <header className="border-line grid gap-1 border-b-2 pb-3">
        <h2 className="type-heading">
          <SheetTitle formKey={key} label={labels.title()} />
        </h2>
        <p className="type-caption">{t("society")}</p>
        <p className="type-caption">
          {t(`statuses.${submission.status as forms.FormStatus}`)}
          {submission.submitted_at
            ? ` · ${t("sentOn", { date: formatLongDate(submission.submitted_at, locale, true) })}`
            : ""}
          {" · "}
          {submission.submitted_by
            ? t("from", { name: nameOf(submission.submitted_by) })
            : t("anonymousSender")}
          {submission.subject_user_id
            ? ` · ${t("about", { name: nameOf(submission.subject_user_id) })}`
            : ""}
          {submission.routing === "none"
            ? ""
            : ` · ${t(`routings.${submission.routing as forms.Routing}`)}`}
        </p>
        <RecordLine submission={submission} />
        {submission.withdrawn_at ? (
          <p className="type-caption font-medium">
            {t("withdrawnOn", {
              date: formatLongDate(submission.withdrawn_at, locale, true),
            })}
          </p>
        ) : null}
        {open && type?.acknowledge_days && !submission.acknowledged_at ? (
          <p className="type-caption">
            {t("acknowledgeBy", {
              date: formatLongDate(
                addDays(submission.submitted_at ?? "", type.acknowledge_days),
                locale
              ),
            })}
          </p>
        ) : null}
        {open && type?.answer_days ? (
          <p className="type-caption">
            {t("answerBy", {
              date: formatLongDate(
                addDays(submission.submitted_at ?? "", type.answer_days),
                locale
              ),
            })}
          </p>
        ) : null}
      </header>
      {submission.submitted_by ? null : (
        <SealedName canOpen={Boolean(actions)} id={submission.id} />
      )}
      <FormValues
        data={(submission.data ?? {}) as forms.FormData}
        fields={definition?.fields ?? []}
        labels={labels}
      />
      <Signatures submission={submission} />
      {definition?.office && Object.keys(submission.office ?? {}).length > 0 ? (
        <section className="grid gap-2">
          <h3 className="type-subheading">{t("office")}</h3>
          <FormValues
            data={(submission.office ?? {}) as forms.FormData}
            fields={definition.office}
            labels={labels}
            office
          />
        </section>
      ) : null}
      {actions ? <div className="print:hidden">{actions}</div> : null}
    </article>
  );
};

/** One of your forms (or one about you), to read, print or keep updating. */
export const ViewForm = ({
  signed = false,
}: {
  /** Opened from Documents (a signed copy) rather than from Requests. */
  readonly signed?: boolean;
}) => {
  const t = useTranslations("diwan.forms");
  const back = signed
    ? { href: "/account/documents", label: t("backToDocuments") }
    : { href: "/account/requests", label: t("back") };
  const { supabase } = useAuth();
  const id = useQueryParam("id") ?? "";
  const submission = useQuery({
    enabled: Boolean(id),
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("form_submissions")
          .select("*")
          .eq("id", id)
          .maybeSingle()
      ),
    queryKey: ["forms", "submission", id],
  });

  if (submission.isPending && id) {
    return <SectionSpinner />;
  }
  if (!submission.data) {
    return <EmptyLine action={back}>{t("notFound")}</EmptyLine>;
  }
  const row = submission.data;

  return (
    <div className="grid max-w-3xl gap-4">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link className="type-body underline" href={back.href}>
          {back.label}
        </Link>
        <Button onClick={() => window.print()} size="sm" variant="outline">
          {t("print")}
        </Button>
      </div>
      <WithdrawConsent submission={row} />
      <SubmissionSheet submission={row} />
    </div>
  );
};

/**
 * A concern whose name is sealed (decisions.md, Governance): the panel
 * sees that it is sealed, and whoever handles it may open the name only
 * for a safety risk or with the signer's agreement; the opening is kept.
 */
const SealedName = ({
  canOpen,
  id,
}: {
  readonly canOpen: boolean;
  readonly id: string;
}) => {
  const t = useTranslations("diwan.forms.sealed");
  const { supabase } = useAuth();
  const state = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase.schema("governance").rpc("sealed_state", {
          submission_id: id,
        })
      ),
    queryKey: ["forms", "sealed", id],
  });
  const open = useMutation({
    mutationFn: async (reason: "safety" | "agreed") =>
      unwrap(
        await supabase
          .schema("governance")
          .rpc("open_sealed", { reason, submission_id: id })
      ),
  });
  if (!state.data) {
    return null;
  }
  return (
    <section className="border-line grid gap-2 border-t pt-3 print:hidden">
      <p className="type-body">
        {state.data === "opened" ? t("opened") : t("sealed")}
      </p>
      {open.data ? (
        <p className="type-body font-medium">
          {t("name", { name: open.data })}
        </p>
      ) : null}
      {canOpen && !open.data ? (
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={open.isPending}
            onClick={() => open.mutate("safety")}
            size="sm"
            variant="outline"
          >
            {t("openSafety")}
          </Button>
          <Button
            disabled={open.isPending}
            onClick={() => open.mutate("agreed")}
            size="sm"
            variant="outline"
          >
            {t("openAgreed")}
          </Button>
        </div>
      ) : null}
      {canOpen ? <p className="type-caption">{t("hint")}</p> : null}
    </section>
  );
};

/** The consents and releases a signer may withdraw for the future. */
const WITHDRAWABLE = new Set(["media-release", "trip-consent"]);

/**
 * Undo what is still yours (decisions.md, Documents and forms): a media
 * release or a trip's consent is withdrawn for the future, with a second
 * step on the page. The signed copy stays, marked withdrawn.
 */
const WithdrawConsent = ({ submission }: { submission: Submission }) => {
  const t = useTranslations("diwan.forms");
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const withdraw = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .rpc("withdraw_consent", { submission_id: submission.id })
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forms"] }),
  });
  if (
    !WITHDRAWABLE.has(submission.form_key) ||
    submission.submitted_by !== user?.id ||
    submission.withdrawn_at
  ) {
    return null;
  }
  return (
    <div className="grid gap-2 print:hidden">
      <InlineConfirm
        confirm={t("withdraw")}
        disabled={withdraw.isPending}
        label={t("withdraw")}
        onConfirm={() => withdraw.mutate()}
        question={
          submission.form_key === "trip-consent"
            ? t("withdrawTripAsk")
            : t("withdrawAsk")
        }
      />
    </div>
  );
};
