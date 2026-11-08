"use client";

import { useAuth } from "@repo/auth/provider";
import { SalCard } from "@repo/brand/components/sal/card";
import { Input } from "@repo/brand/components/ui/input";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { hasPermissionAnywhere } from "@repo/rbac";
import { localized, membership, type partners, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Signature } from "@/components/signature";
import { useGrants } from "@/lib/diwan/queries";
import { DiwanSection } from "../../page";
import { ErrorState, SectionSpinner } from "../../states";
import { ConfirmAction, ErrorLine, Field } from "../kit";
import { CouncilVote } from "../partners/council-vote";
import { memberName } from "./directory";

interface Request {
  created_at: string;
  email: string;
  id: string;
  statement: string | null;
  user_id: string;
}

const RequestCard = ({ request, name }: { request: Request; name: string }) => {
  const t = useTranslations("diwan.admin.verification");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const decide = useMutation({
    mutationFn: (approve: boolean) =>
      membership.decideVerification(supabase, request.id, approve, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin"] }),
  });

  return (
    <SalCard>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">{name}</p>
        <p className="text-sm break-all" dir="ltr">
          {request.email}
        </p>
      </div>
      <p className="type-caption">
        {t("applied")}: {formatLongDate(request.created_at, locale, true)}
      </p>
      <div>
        <p className="type-label">{t("statement")}</p>
        <p className="type-body whitespace-pre-line">
          {request.statement || t("noStatement")}
        </p>
      </div>
      <Field label={t("decisionNote")}>
        {(id) => (
          <Input
            id={id}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            value={note}
          />
        )}
      </Field>
      <div className="flex flex-wrap gap-2">
        <ConfirmAction
          confirmLabel={t("approve")}
          description={t("approveConfirm", { email: request.email })}
          disabled={decide.isPending}
          onConfirm={() => decide.mutate(true)}
          variant="default"
        >
          {t("approve")}
        </ConfirmAction>
        <ConfirmAction
          confirmLabel={t("reject")}
          description={t("rejectConfirm", { email: request.email })}
          disabled={decide.isPending}
          onConfirm={() => decide.mutate(false)}
        >
          {t("reject")}
        </ConfirmAction>
      </div>
      <ErrorLine error={decide.error} />
    </SalCard>
  );
};

interface Application extends Record<string, unknown> {
  agreement_id: string;
  applied_at: string | null;
  kind: string;
  name_ar: string | null;
  name_en: string;
  partner_id: string;
  partner_signatory: string | null;
  slug: string;
}

interface Proposal {
  grants: string[];
  id: string;
  partner_will: string | null;
  purpose_en: string;
}

/**
 * One partner application: the organization, what it proposes, who signed
 * for it; the Council's adopted resolution is recorded (partners.sign,
 * decisions §10), and partnership managers may decline.
 */
const ApplicationCard = ({
  application,
  proposal,
}: {
  application: Application;
  proposal?: Proposal;
}) => {
  const t = useTranslations("diwan.admin.verification");
  const tg = useTranslations("diwan.admin.partners.agreements.grants");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const grants = useGrants();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const name = localized(application, "name", locale);
  const done = () => queryClient.invalidateQueries({ queryKey: ["admin"] });
  const decline = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("governance").rpc("decline_partner_application", {
          partner: application.partner_id,
          reason: reason.trim(),
        })
      ),
    onSuccess: done,
  });
  return (
    <SalCard>
      <p className="font-medium">{name}</p>
      <p className="type-caption">
        {application.applied_at
          ? t("appliedBy", {
              date: formatLongDate(application.applied_at, locale),
              name: application.partner_signatory ?? "",
            })
          : null}
      </p>
      {proposal ? (
        <dl className="grid gap-3">
          <div>
            <dt className="type-label">{t("purpose")}</dt>
            <dd className="type-body whitespace-pre-line" dir="auto">
              {proposal.purpose_en}
            </dd>
          </div>
          {proposal.partner_will ? (
            <div>
              <dt className="type-label">{t("partnerWill")}</dt>
              <dd className="type-body whitespace-pre-line" dir="auto">
                {proposal.partner_will}
              </dd>
            </div>
          ) : null}
          {proposal.grants.length > 0 ? (
            <div>
              <dt className="type-label">{t("asks")}</dt>
              <dd className="type-body">
                {proposal.grants
                  .map((g) => tg(g as partners.AgreementGrant))
                  .join(", ")}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <Field label={t("decisionNote")}>
        {(id) => (
          <Input
            id={id}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            value={reason}
          />
        )}
      </Field>
      {application.partner_signatory ? (
        <Signature
          date={application.applied_at ?? undefined}
          name={application.partner_signatory}
        />
      ) : null}
      {hasPermissionAnywhere(grants.data, "partners.sign") ? (
        <CouncilVote agreementId={application.agreement_id} name={name} />
      ) : null}
      <div className="flex flex-wrap gap-2">
        {hasPermissionAnywhere(grants.data, "partners.manage") ? (
          <ConfirmAction
            confirmLabel={t("reject")}
            description={t("declineConfirm", { name })}
            disabled={decline.isPending}
            onConfirm={() => decline.mutate()}
          >
            {t("reject")}
          </ConfirmAction>
        ) : null}
      </div>
      <ErrorLine error={decline.error} />
    </SalCard>
  );
};

/** Requests from before partners verified their own people. */
const EarlierRequests = () => {
  const t = useTranslations("diwan.admin.verification");
  const locale = useLocale();
  const { supabase } = useAuth();
  const requests = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("membership")
          .from("verification_requests")
          .select("id, user_id, email, statement, created_at")
          .eq("status", "pending")
          .order("created_at")
      ) ?? [],
    queryKey: ["admin", "verification"],
  });
  const profiles = useQuery({
    enabled: Boolean(requests.data?.length),
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("core")
          .from("profiles")
          .select("id, full_name_en, full_name_ar")
          .in("id", requests.data?.map((r) => r.user_id) ?? [])
      ) ?? [],
    queryKey: ["admin", "verification", "profiles", requests.data],
  });
  if (!requests.data?.length) {
    return null;
  }
  return (
    <DiwanSection id="earlier" title={t("earlier")}>
      <p className="type-body">{t("earlierLede")}</p>
      <ul className="gap-space-4 grid">
        {requests.data.map((request) => {
          const profile = profiles.data?.find((p) => p.id === request.user_id);
          return (
            <li key={request.id}>
              <RequestCard
                name={profile ? memberName(profile, locale) : ""}
                request={request}
              />
            </li>
          );
        })}
      </ul>
    </DiwanSection>
  );
};

/**
 * The Society verifies partners; partners verify their own people (owner,
 * Oct 31, 2026). What waits here is partner applications: the first view
 * of Partners (/partnerships/applications; Nov 4, 2026, one place for
 * partners).
 */
export const VerificationQueue = () => {
  const t = useTranslations("diwan.admin.verification");
  const { supabase } = useAuth();
  const applications = useQuery({
    queryFn: async () =>
      (unwrap(
        await supabase.schema("governance").rpc("partner_applications")
      ) ?? []) as Application[],
    queryKey: ["admin", "partner-applications"],
  });
  const ids = applications.data?.map((a) => a.agreement_id) ?? [];
  const proposals = useQuery({
    enabled: ids.length > 0,
    queryFn: async () =>
      (unwrap(
        await supabase
          .schema("governance")
          .from("partner_agreements")
          .select("id, purpose_en, partner_will, grants")
          .in("id", ids)
      ) ?? []) as Proposal[],
    queryKey: ["admin", "partner-applications", "proposals", ids],
  });

  if (applications.isPending) {
    return <SectionSpinner />;
  }
  if (applications.isError) {
    return <ErrorState onRetry={() => applications.refetch()} />;
  }

  return (
    <div className="grid gap-6">
      <p className="type-body">{t("lede")}</p>
      {applications.data.length === 0 ? (
        <p className="type-body text-text-secondary">{t("empty")}</p>
      ) : (
        <ul className="gap-space-4 grid">
          {applications.data.map((application) => (
            <li key={application.partner_id}>
              <ApplicationCard
                application={application}
                proposal={proposals.data?.find(
                  (p) => p.id === application.agreement_id
                )}
              />
            </li>
          ))}
        </ul>
      )}
      <EarlierRequests />
    </div>
  );
};
