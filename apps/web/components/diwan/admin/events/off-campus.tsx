"use client";

import { useAuth } from "@repo/auth/provider";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { hasPermission } from "@repo/rbac";
import { unwrap } from "@repo/sal-data";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { DateInput } from "@/components/fields/date-input";
import { useGrants } from "@/lib/diwan/queries";
import { DiwanSection } from "../../page";
import { ErrorLine, Field, SaveButton } from "../kit";

interface OffCampusEvent {
  readonly id: string;
  readonly off_campus: boolean;
  readonly status: string;
  readonly student_life_approved_by: string | null;
  readonly student_life_approved_on: string | null;
}

/**
 * Off campus, a standard field of every event (decisions.md): an event
 * away from campus is published only once Student Life's written approval,
 * its date and who approved, is on record, which the General Secretary
 * records (governance.manage); participants sign the trip consent form
 * (F-45) on the site before they book.
 */
export const EventOffCampus = ({
  event,
}: {
  readonly event: OffCampusEvent;
}) => {
  const t = useTranslations("diwan.admin.event.occasion");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const grants = useGrants();
  const secretary = hasPermission(grants.data, "governance.manage");
  const [date, setDate] = useState(event.student_life_approved_on ?? "");
  const [by, setBy] = useState(event.student_life_approved_by ?? "");
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "event", event.id] });
  const toggle = useMutation({
    mutationFn: async (value: boolean) =>
      unwrap(
        await supabase
          .schema("events")
          .from("events")
          .update({ off_campus: value })
          .eq("id", event.id)
      ),
    onSuccess: refresh,
  });
  const record = useMutation({
    mutationFn: async (value: string | null) =>
      unwrap(
        await supabase.schema("events").rpc("record_approval", {
          approved_by: value ? by.trim() : (null as unknown as string),
          approved_on: value as string,
          event_id: event.id,
        })
      ),
    onSuccess: refresh,
  });
  const submitApproval = (e: FormEvent) => {
    e.preventDefault();
    record.mutate(date || null);
  };
  const approvedOn = event.student_life_approved_on;
  return (
    <DiwanSection id="off-campus" title={t("title")}>
      <p className="type-body text-text-secondary">{t("lede")}</p>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={event.off_campus}
          disabled={toggle.isPending}
          id={`off-campus-${event.id}`}
          onCheckedChange={(value) => toggle.mutate(value === true)}
        />
        <Label className="leading-normal" htmlFor={`off-campus-${event.id}`}>
          {t("label")}
        </Label>
      </div>
      <ErrorLine error={toggle.error} />
      {event.off_campus ? (
        <div className="border-line grid gap-4 border-t pt-4">
          <p className="type-body">
            {approvedOn
              ? t("approvedBy", {
                  by: event.student_life_approved_by ?? "",
                  date: formatLongDate(approvedOn, locale),
                })
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
              <Field label={t("by")}>
                {(id) => (
                  <Input
                    className="max-w-md"
                    id={id}
                    maxLength={200}
                    onChange={(e) => setBy(e.target.value)}
                    value={by}
                  />
                )}
              </Field>
              <SaveButton
                disabled={
                  (date === (approvedOn ?? "") &&
                    by === (event.student_life_approved_by ?? "")) ||
                  (Boolean(date) && !by.trim()) ||
                  (!date && event.status === "published")
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
