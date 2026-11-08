"use client";

import { useAuth } from "@repo/auth/provider";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { type governance, localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { DateInput } from "@/components/fields/date-input";
import { Link } from "@/lib/diwan/navigation";
import { useQueryParam } from "@/lib/diwan/use-query-param";
import { ErrorState, SectionSpinner } from "../../states";
import { AdminHeading, ConfirmAction, ErrorLine, Field } from "../kit";
import { NotionManaged } from "../notion-managed";
import { TextView } from "../pipeline/text-view";
import { MeetingResolutions } from "./admin";

/**
 * A meeting's minutes (decisions §8): written in Notion and copied here by
 * the sync, so the text is shown, not edited. The Council adopts them here,
 * after the vote; adopted minutes are the locked official copy. Under them,
 * the resolutions the meeting adopted.
 */
export const MinutesEditor = () => {
  const t = useTranslations("diwan.admin.governance");
  const tk = useTranslations("diwan.admin.kit");
  const locale = useLocale() as Locale;
  const minutesId = useQueryParam("id");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [adoptedOn, setAdoptedOn] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const existing = useQuery({
    enabled: Boolean(minutesId),
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("minutes")
          .select("*")
          .eq("id", minutesId ?? "")
          .maybeSingle()
      ),
    queryKey: ["admin", "governance", "minutes", minutesId],
  });

  const adopt = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("minutes")
          .update({ adopted_on: adoptedOn, status: "approved" })
          .eq("id", minutesId ?? "")
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "governance"] }),
  });

  if (existing.isPending) {
    return <SectionSpinner />;
  }
  if (existing.isError) {
    return <ErrorState onRetry={() => existing.refetch()} />;
  }
  const minutes = existing.data;
  if (!(minutesId && minutes)) {
    return (
      <p className="type-body text-text-secondary">{t("minutes.notFound")}</p>
    );
  }
  const adopted = minutes.status === "approved";

  return (
    <div className="grid gap-8">
      <AdminHeading
        actions={
          <Link
            className="text-sm underline underline-offset-4"
            href="/council"
          >
            {tk("back")}
          </Link>
        }
        title={localized(minutes, "title", locale)}
      >
        {`${t(`bodies.${minutes.body as governance.MeetingBody}`)} · ${formatLongDate(minutes.meeting_on, locale, true)} · ${
          adopted && minutes.adopted_on
            ? `${t("statuses.adopted")}, ${formatLongDate(minutes.adopted_on, locale, true)}`
            : t("statuses.draft")
        }`}
      </AdminHeading>
      <NotionManaged kind="minutes" recordId={minutesId} />
      <div className="grid max-w-4xl gap-6">
        <TextView html={minutes.text_en} lang="en" />
        <TextView html={minutes.text_ar} lang="ar" />
      </div>
      {adopted ? (
        <p className="type-caption">{t("minutes.locked")}</p>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <Field className="w-44" label={t("minutes.adoptedOn")}>
            {(id) => (
              <DateInput
                id={id}
                onChange={(e) => setAdoptedOn(e.target.value)}
                value={adoptedOn}
              />
            )}
          </Field>
          <ConfirmAction
            confirmLabel={t("minutes.adopt")}
            description={t("minutes.adoptConfirm")}
            disabled={adopt.isPending}
            onConfirm={() => adopt.mutate()}
            variant="default"
          >
            {t("minutes.adopt")}
          </ConfirmAction>
        </div>
      )}
      <ErrorLine error={adopt.error} />
      {/* The resolutions this meeting adopted. */}
      <MeetingResolutions meetingId={minutesId} />
    </div>
  );
};
