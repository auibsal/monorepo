"use client";

import { Button } from "@repo/brand/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ErrorLine, RecordList } from "@/components/diwan/admin/kit";
import { DiwanSection, RowList } from "@/components/diwan/page";
import { EmptyLine, SectionSpinner } from "@/components/diwan/states";
import { useAuth } from "@/lib/auth/provider";
import { localized, programs, unwrap } from "@/lib/data";
import { StatusLine } from "./flow";

/**
 * Your applications, in Your account → Roles (decisions.md, Get involved
 * and roles): where each stands, an interview's
 * time, an offer to accept or decline within 7 days, and withdrawing,
 * which is kept as a status.
 */
export const Applications = () => {
  const t = useTranslations("diwan.getInvolved.applications");
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["applications", user?.id ?? ""];
  const list = useQuery({
    enabled: Boolean(user),
    queryFn: () => programs.myApplications(supabase, user?.id ?? ""),
    queryKey: key,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const withdraw = useMutation({
    mutationFn: (openingId: string) =>
      programs.withdrawApplication(supabase, openingId),
    onSuccess: refresh,
  });
  const answer = useMutation({
    mutationFn: ({
      accept,
      openingId,
    }: {
      accept: boolean;
      openingId: string;
    }) => programs.answerOffer(supabase, openingId, accept),
    onSuccess: refresh,
  });
  return (
    <DiwanSection description={t("lede")} id="applications" title={t("title")}>
      {list.isPending ? <SectionSpinner /> : null}
      {list.data ? (
        <RecordList
          empty={
            <EmptyLine action={{ href: "/get-involved", label: t("browse") }}>
              {t("none")}
            </EmptyLine>
          }
          items={list.data}
          matches={(a, q) =>
            [
              a.reference,
              (a.opening as { title_en?: string } | null)?.title_en,
              (a.opening as { title_ar?: string } | null)?.title_ar,
            ].some((v) => v?.toLowerCase().includes(q))
          }
        >
          {(found) => (
            <RowList>
              {found.map((a) => (
                <ApplicationRow
                  answer={answer}
                  application={a}
                  key={a.opening_id}
                  withdraw={withdraw}
                />
              ))}
            </RowList>
          )}
        </RecordList>
      ) : null}
      <ErrorLine error={withdraw.error ?? answer.error ?? list.error} />
    </DiwanSection>
  );
};

type Application = Awaited<ReturnType<typeof programs.myApplications>>[number];

/** One application's row: where it stands and what can be done now. */
const ApplicationRow = ({
  answer,
  application: a,
  withdraw,
}: {
  readonly answer: {
    isPending: boolean;
    mutate: (v: { accept: boolean; openingId: string }) => void;
  };
  readonly application: Application;
  readonly withdraw: {
    isPending: boolean;
    mutate: (openingId: string) => void;
  };
}) => {
  const t = useTranslations("diwan.getInvolved.applications");
  const locale = useLocale() as Locale;

  const status = a.status as programs.ApplicationStatus;
  const opening = a.opening as {
    title_ar: string;
    title_en: string;
  } | null;
  return (
    <li className="grid gap-2">
      <p className="font-medium">
        {opening ? localized(opening, "title", locale) : ""}
      </p>
      {status === "draft" ? (
        <p className="type-caption">{t("status.draft")}</p>
      ) : (
        <>
          <StatusLine kind="opening" status={status} />
          <p className="type-caption">
            {a.reference}
            {status === "talking" && a.talk_at
              ? ` · ${t("talkOn", {
                  date: formatLongDate(a.talk_at, locale),
                  time: formatClock(a.talk_at, locale),
                })}`
              : ""}
            {status === "offered" && a.offer_expires_at
              ? ` · ${t("answerBy", {
                  date: formatLongDate(a.offer_expires_at, locale),
                })}`
              : ""}
          </p>
        </>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {status === "draft" ? (
          <Link className="link" href={`/get-involved/${a.opening_id}`}>
            {t("finish")}
          </Link>
        ) : null}
        {status === "offered" ? (
          <>
            <Button
              disabled={answer.isPending}
              onClick={() =>
                answer.mutate({
                  accept: true,
                  openingId: a.opening_id,
                })
              }
              size="sm"
            >
              {t("accept")}
            </Button>
            <Button
              disabled={answer.isPending}
              onClick={() =>
                answer.mutate({
                  accept: false,
                  openingId: a.opening_id,
                })
              }
              size="sm"
              variant="outline"
            >
              {t("decline")}
            </Button>
          </>
        ) : null}
        {["draft", "new", "talking", "picked"].includes(status) ? (
          <button
            className="link type-caption"
            disabled={withdraw.isPending}
            onClick={() => withdraw.mutate(a.opening_id)}
            type="button"
          >
            {t("withdraw")}
          </button>
        ) : null}
      </div>
    </li>
  );
};

/**
 * Your auditions, with the applications in Your account → Roles
 * (decisions.md, The site: "One form flow"): each production's audition,
 * its record number and where it stands (Received, Callback, Decision).
 */
export const MyAuditions = () => {
  const t = useTranslations("diwan.getInvolved.auditions");
  const locale = useLocale() as Locale;
  const { supabase, user } = useAuth();
  const list = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("api")
          .from("audition_signups")
          .select(
            "audition_id, status, reference, audition:auditions(starts_at, production:productions(title_en, title_ar))"
          )
          .eq("user_id", user?.id ?? "")
          .order("created_at", { ascending: false })
      ) ?? [],
    queryKey: ["my-auditions", user?.id ?? ""],
  });
  if (list.isPending || (list.data ?? []).length === 0) {
    return null;
  }
  return (
    <DiwanSection id="auditions" title={t("title")}>
      <RowList>
        {(list.data ?? []).map((a) => {
          const audition = a.audition as {
            production: { title_ar: string; title_en: string } | null;
            starts_at: string;
          } | null;
          return (
            <li className="grid gap-2" key={a.audition_id}>
              <p className="font-medium">
                {audition?.production
                  ? localized(audition.production, "title", locale)
                  : ""}
              </p>
              <StatusLine kind="audition" status={a.status} />
              <p className="type-caption">
                {[
                  a.reference,
                  audition
                    ? `${formatLongDate(audition.starts_at, locale)}, ${formatClock(audition.starts_at, locale)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </li>
          );
        })}
      </RowList>
      <ErrorLine error={list.error} />
    </DiwanSection>
  );
};
