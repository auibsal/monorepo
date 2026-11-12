"use client";

import { Textarea } from "@repo/brand/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import {
  AddInPlace,
  DateTimeField,
  ErrorLine,
  Field,
  SaveButton,
} from "../kit";

const key = (eventId: string) => ["admin", "event-incidents", eventId];

/** Writes one incident report; closes in place once saved. */
const NewIncident = ({
  eventId,
  onDone,
}: {
  readonly eventId: string;
  readonly onDone: () => void;
}) => {
  const t = useTranslations("diwan.admin.event.incidents");
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const [happenedAt, setHappenedAt] = useState<string | null>(
    new Date().toISOString()
  );
  const [what, setWhat] = useState("");
  const [action, setAction] = useState("");
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .from("incident_reports")
          .insert({
            action_taken: action.trim() || null,
            event_id: eventId,
            happened_at: happenedAt ?? new Date().toISOString(),
            reported_by: user?.id ?? "",
            what_happened: what.trim(),
          })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key(eventId) });
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
      <DateTimeField
        label={t("when")}
        onChange={setHappenedAt}
        required
        value={happenedAt}
      />
      <Field hint={t("whatHint")} label={t("what")}>
        {(id) => (
          <Textarea
            id={id}
            maxLength={4000}
            onChange={(e) => setWhat(e.target.value)}
            required
            rows={5}
            value={what}
          />
        )}
      </Field>
      <Field label={t("action")}>
        {(id) => (
          <Textarea
            id={id}
            maxLength={4000}
            onChange={(e) => setAction(e.target.value)}
            rows={3}
            value={action}
          />
        )}
      </Field>
      <ErrorLine error={add.error} />
      <SaveButton disabled={!what.trim()} pending={add.isPending} />
    </form>
  );
};

/**
 * Incident reports from the event's page (decisions.md, Forms): whoever
 * runs the event writes one; the Director of Events and the President read
 * them and are told at once by email. Each writer sees their own.
 */
export const Incidents = ({ eventId }: { readonly eventId: string }) => {
  const t = useTranslations("diwan.admin.event.incidents");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const reports = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .from("incident_reports")
          .select("id, happened_at, what_happened, action_taken")
          .eq("event_id", eventId)
          .order("happened_at", { ascending: false })
      ),
    queryKey: key(eventId),
  });
  return (
    <section className="border-line grid gap-4 border-t pt-8">
      <h2 className="type-heading">{t("title")}</h2>
      <p className="type-body text-text-secondary max-w-3xl">{t("lede")}</p>
      <AddInPlace label={t("add")}>
        {(close) => <NewIncident eventId={eventId} onDone={close} />}
      </AddInPlace>
      {(reports.data ?? []).length > 0 ? (
        <ul className="grid gap-4">
          {(reports.data ?? []).map((r) => (
            <li className="border-line grid gap-1 border-t pt-3" key={r.id}>
              <p className="type-caption">
                {`${formatLongDate(r.happened_at, locale)}, ${formatClock(r.happened_at, locale)}`}
              </p>
              <p className="type-body whitespace-pre-line">{r.what_happened}</p>
              {r.action_taken ? (
                <p className="type-body text-text-secondary whitespace-pre-line">
                  {`${t("action")}: ${r.action_taken}`}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
};
