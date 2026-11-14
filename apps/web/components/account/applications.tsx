"use client";

import { Button } from "@repo/brand/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ErrorLine } from "@/components/diwan/admin/kit";
import { DiwanSection, RowList } from "@/components/diwan/page";
import { SectionSpinner } from "@/components/diwan/states";
import { useAuth } from "@/lib/auth/provider";
import { localized, programmes } from "@/lib/data";

/**
 * Your applications, in Your account → Roles (decisions.md, Get involved
 * and roles): where each stands, an interview's
 * time, an offer to accept or decline within 7 days, and withdrawing,
 * which is kept as a status.
 */
export const Applications = () => {
  const t = useTranslations("diwan.getInvolved.applications");
  const locale = useLocale() as Locale;
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["applications", user?.id ?? ""];
  const list = useQuery({
    enabled: Boolean(user),
    queryFn: () => programmes.myApplications(supabase, user?.id ?? ""),
    queryKey: key,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const withdraw = useMutation({
    mutationFn: (openingId: string) =>
      programmes.withdrawApplication(supabase, openingId),
    onSuccess: refresh,
  });
  const answer = useMutation({
    mutationFn: ({
      accept,
      openingId,
    }: {
      accept: boolean;
      openingId: string;
    }) => programmes.answerOffer(supabase, openingId, accept),
    onSuccess: refresh,
  });
  return (
    <DiwanSection description={t("lede")} id="applications" title={t("title")}>
      {list.isPending ? <SectionSpinner /> : null}
      {list.data?.length === 0 ? (
        <p className="type-body text-text-secondary">
          {t("none")}{" "}
          <Link className="link" href="/get-involved">
            {t("browse")}
          </Link>
        </p>
      ) : null}
      <RowList>
        {(list.data ?? []).map((a) => {
          const status = a.status as programmes.ApplicationStatus;
          const opening = a.opening as {
            title_ar: string;
            title_en: string;
          } | null;
          return (
            <li className="grid gap-2" key={a.opening_id}>
              <p className="font-medium">
                {opening ? localized(opening, "title", locale) : ""}
              </p>
              <p className="type-caption">
                {t(`status.${status}`)}
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
                        answer.mutate({ accept: true, openingId: a.opening_id })
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
        })}
      </RowList>
      <ErrorLine error={withdraw.error ?? answer.error ?? list.error} />
    </DiwanSection>
  );
};
