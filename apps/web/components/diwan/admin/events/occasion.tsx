"use client";

import { useAuth } from "@repo/auth/provider";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { hasPermission } from "@repo/rbac";
import { events, unwrap } from "@repo/sal-data";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { DateInput } from "@/components/fields/date-input";
import { useGrants } from "@/lib/diwan/queries";
import { DiwanSection } from "../../page";
import { ErrorLine, Field, SaveButton, SelectInput } from "../kit";

const NONE = "none";

/**
 * The event's occasion, with its own page (the design review A34, A36),
 * and, for the trip to al-Mutanabbi Street, Student Life's approval: the
 * General Secretary records it (governance.manage); the trip is published
 * only once it is on record.
 */
const OccasionForm = ({
  approvedOn,
  eventId,
  occasion,
  status,
}: {
  readonly approvedOn: string | null;
  readonly eventId: string;
  readonly occasion: string | null;
  readonly status: string;
}) => {
  const t = useTranslations("diwan.admin.event.occasion");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const grants = useGrants();
  const secretary = hasPermission(grants.data, "governance.manage");
  const [choice, setChoice] = useState(occasion ?? NONE);
  const [date, setDate] = useState(approvedOn ?? "");
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "event", eventId] });

  const saveOccasion = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .from("events")
          .update({ occasion: choice === NONE ? null : choice })
          .eq("id", eventId)
      ),
    onSuccess: refresh,
  });
  const record = useMutation({
    mutationFn: async (value: string | null) =>
      unwrap(
        await supabase.schema("events").rpc("record_approval", {
          approved_on: value as string,
          event_id: eventId,
        })
      ),
    onSuccess: refresh,
  });

  const submitOccasion = (event: FormEvent) => {
    event.preventDefault();
    saveOccasion.mutate();
  };
  const submitApproval = (event: FormEvent) => {
    event.preventDefault();
    record.mutate(date || null);
  };
  const trip = occasion === "book_street_trip";

  return (
    <DiwanSection id="occasion" title={t("title")}>
      <p className="type-body text-text-secondary">{t("lede")}</p>
      <form className="grid gap-4" onSubmit={submitOccasion}>
        <Field label={t("label")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) => setChoice(e.target.value)}
              value={choice}
            >
              <option value={NONE}>{t("none")}</option>
              {events.OCCASIONS.map((o) => (
                <option key={o} value={o}>
                  {t(`kinds.${o}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <SaveButton
          disabled={choice === (occasion ?? NONE)}
          pending={saveOccasion.isPending}
        />
        <ErrorLine error={saveOccasion.error} />
      </form>
      {trip ? (
        <div className="grid gap-4 border-line border-t pt-4">
          <p className="type-body">
            {approvedOn
              ? t("approved", { date: formatLongDate(approvedOn, locale) })
              : t("waiting")}
          </p>
          {secretary ? (
            <form className="grid gap-4" onSubmit={submitApproval}>
              <Field hint={t("dateHint")} label={t("date")}>
                {(id) => (
                  <DateInput
                    className="max-w-xs"
                    id={id}
                    onChange={(e) => setDate(e.target.value)}
                    value={date}
                  />
                )}
              </Field>
              <SaveButton
                disabled={
                  date === (approvedOn ?? "") ||
                  (!date && status === "published")
                }
                pending={record.isPending}
              />
              <ErrorLine error={record.error} />
            </form>
          ) : (
            <p className="type-caption text-text-secondary">
              {t("bySecretary")}
            </p>
          )}
        </div>
      ) : null}
    </DiwanSection>
  );
};

interface OccasionEvent {
  readonly id: string;
  readonly occasion: string | null;
  readonly status: string;
  readonly student_life_approved_on: string | null;
}

export const EventOccasion = ({
  event,
}: {
  readonly event: OccasionEvent | null | undefined;
}) =>
  event ? (
    <OccasionForm
      approvedOn={event.student_life_approved_on}
      eventId={event.id}
      key={`${event.occasion}-${event.student_life_approved_on}`}
      occasion={event.occasion}
      status={event.status}
    />
  ) : null;
