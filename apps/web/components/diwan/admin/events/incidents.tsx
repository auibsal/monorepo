"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Label } from "@repo/brand/components/ui/label";
import { Textarea } from "@repo/brand/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { useGrants } from "@/lib/diwan/queries";
import { hasPermission } from "@/lib/rbac";
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
  const [qalam, setQalam] = useState(false);
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
            qalam,
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
      <div className="flex items-center gap-2">
        <Checkbox
          checked={qalam}
          id="incident-qalam"
          onCheckedChange={(checked) => setQalam(checked === true)}
        />
        <Label className="font-normal" htmlFor="incident-qalam">
          {t("qalam")}
        </Label>
      </div>
      <ErrorLine error={add.error} />
      <SaveButton disabled={!what.trim()} pending={add.isPending} />
    </form>
  );
};

/**
 * Closing a case (decisions.md, Privacy and data): the Director of Events
 * or the President; the record is kept two years from then, seven for
 * Qalam. Reopening clears the date.
 */
const CloseCase = ({
  closedAt,
  eventId,
  id,
}: {
  readonly closedAt: string | null;
  readonly eventId: string;
  readonly id: string;
}) => {
  const t = useTranslations("diwan.admin.event.incidents");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const close = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .rpc("close_incident", { closed: !closedAt, report: id })
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(eventId) }),
  });
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <Button
        className="px-0"
        disabled={close.isPending}
        onClick={() => close.mutate()}
        type="button"
        variant="link"
      >
        {closedAt ? t("reopen") : t("close")}
      </Button>
      <ErrorLine error={close.error} />
    </div>
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
  const grants = useGrants();
  const closes = hasPermission(grants.data, "events.manage");
  const reports = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .from("incident_reports")
          .select(
            "id, happened_at, what_happened, action_taken, closed_at, qalam"
          )
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
              <p className="type-caption text-text-secondary">
                {[
                  r.qalam ? t("qalam") : null,
                  r.closed_at
                    ? t("closedOn", {
                        date: formatLongDate(r.closed_at, locale),
                      })
                    : t("open"),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {closes ? (
                <CloseCase closedAt={r.closed_at} eventId={eventId} id={r.id} />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
};
