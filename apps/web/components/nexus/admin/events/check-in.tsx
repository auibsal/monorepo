"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import type { Locale } from "@repo/internationalization";
import {
  formatClock,
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { DataError, localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { Link } from "@/lib/nexus/navigation";
import { passEnabled } from "@/lib/nexus/pass-enabled";
import { useQueryParam } from "@/lib/nexus/use-query-param";
import { SectionSpinner } from "../../states";
import { CardScanner, parseCard } from "../card-scanner";
import { AdminHeading, Field } from "../kit";
import { memberName } from "../members/directory";
import { isPassCard, passProblem, scanPass } from "../pass-scan";
import { useAttendeeSearch } from "./attendance";

const TICKET = /^sal:ticket:([0-9a-f]{24})$/;

/**
 * What a scanned code asks for: a ticket, an IDEA Pass card, SAL's own
 * card (until the Pass replaces it), or nothing.
 */
export const parseScan = (value: string) => {
  const ticket = TICKET.exec(value.trim());
  if (ticket?.[1]) {
    return { ticket_code: ticket[1] } as const;
  }
  if (isPassCard(value)) {
    return { pass: value.trim() } as const;
  }
  return parseCard(value);
};

type Outcome =
  | { kind: "checked"; name: string }
  | { kind: "already"; name: string }
  | { kind: "invalid" }
  | { kind: "notLive" }
  | { kind: "notMember" }
  | { kind: "rateLimited" }
  | { kind: "retired" }
  | { kind: "unknown" }
  | { kind: "error" };

export const CheckInScreen = () => {
  const t = useTranslations("nexus.admin.checkIn");
  const tk = useTranslations("nexus.admin.kit");
  const locale = useLocale() as Locale;
  const eventId = useQueryParam("id") ?? "";
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [query, setQuery] = useState("");

  const event = useQuery({
    enabled: Boolean(eventId),
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .from("events")
          .select("id, title_en, title_ar, starts_at")
          .eq("id", eventId)
          .maybeSingle()
      ),
    queryKey: ["admin", "check-in-event", eventId],
  });
  const count = useQuery({
    enabled: Boolean(eventId),
    queryFn: async () =>
      (
        await supabase
          .schema("events")
          .from("check_ins")
          .select("id", { count: "exact", head: true })
          .eq("event_id", eventId)
      ).count ?? 0,
    queryKey: ["admin", "check-in-count", eventId],
  });
  const results = useAttendeeSearch(eventId, query);

  const checkIn = useMutation({
    mutationFn: async (
      target:
        | { ticket_code: string }
        | { target_user: string }
        | { pass: string }
        | { card_code: string; digits: string }
    ) => {
      if ("pass" in target) {
        const scan = await scanPass(supabase, target.pass);
        return unwrap(
          await supabase
            .schema("events")
            .rpc("check_in_pass", { event_id: eventId, scan })
        );
      }
      return unwrap(
        "card_code" in target
          ? await supabase.schema("events").rpc("check_in_card", {
              card_code: target.card_code,
              digits: target.digits,
              event_id: eventId,
            })
          : await supabase
              .schema("events")
              .rpc("check_in", { event_id: eventId, ...target })
      );
    },
    onError: (error) => {
      const pass = passProblem(error);
      if (pass) {
        setOutcome({ kind: pass });
      } else if (
        error instanceof DataError &&
        error.message.includes("card_not_live")
      ) {
        setOutcome({ kind: "notLive" });
      } else if (error instanceof DataError && error.code === "P0002") {
        setOutcome({ kind: "invalid" });
      } else {
        setOutcome({ kind: "error" });
      }
    },
    onSuccess: async (rows) => {
      const person = rows?.[0];
      const name = person ? memberName(person, locale) : "";
      setOutcome({ kind: person?.already ? "already" : "checked", name });
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });

  const handleCode = useCallback(
    (value: string) => {
      const target = parseScan(value);
      if (target && "card_code" in target && passEnabled) {
        setOutcome({ kind: "retired" });
      } else if (target) {
        checkIn.mutate(target);
      } else {
        setOutcome({ kind: "unknown" });
      }
    },
    [checkIn]
  );

  if (event.isPending) {
    return <SectionSpinner />;
  }
  if (!event.data) {
    return <p className="type-body text-text-secondary">{t("unknownCode")}</p>;
  }

  let message: string | null = null;
  if (outcome?.kind === "checked") {
    message = t("checkedIn", { name: outcome.name });
  } else if (outcome?.kind === "already") {
    message = t("already", { name: outcome.name });
  } else if (outcome?.kind === "invalid") {
    message = t("invalidTicket");
  } else if (outcome?.kind === "notLive") {
    message = t("cardNotLive");
  } else if (outcome?.kind === "notMember") {
    message = t("passNotMember");
  } else if (outcome?.kind === "rateLimited") {
    message = t("passRateLimited");
  } else if (outcome?.kind === "retired") {
    message = t("cardRetired");
  } else if (outcome?.kind === "unknown") {
    message = t("unknownCode");
  } else if (outcome?.kind === "error") {
    message = tk("reasons.unknown");
  }

  return (
    <div className="grid max-w-2xl gap-6">
      <AdminHeading
        actions={
          <Link
            className="text-sm underline underline-offset-4"
            href={{ pathname: "/events/edit", query: { id: eventId } }}
          >
            {tk("back")}
          </Link>
        }
        title={`${t("title")}: ${localized(event.data, "title", locale)}`}
      >
        {formatLongDate(event.data.starts_at, locale)},{" "}
        {formatClock(event.data.starts_at, locale)}
      </AdminHeading>
      <p className="type-body text-text-secondary">
        {passEnabled ? t("ledePass") : t("lede")}
      </p>
      <p className="font-medium text-text" role="status">
        {t("count", { count: formatNumber(count.data ?? 0) })}
      </p>

      <CardScanner onCode={handleCode} />

      <p
        aria-live="assertive"
        className={
          message
            ? "border-line border-t p-space-4 font-medium text-lg text-text"
            : "sr-only"
        }
      >
        {message}
      </p>

      <section className="grid gap-3">
        <Field label={t("lookup")}>
          {(id) => (
            <Input
              id={id}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              value={query}
            />
          )}
        </Field>
        {results.data &&
        query.trim().length >= 2 &&
        results.data.length === 0 ? (
          <p className="type-body text-text-secondary">{t("noResults")}</p>
        ) : null}
        <ul className="grid gap-2">
          {results.data?.map((person) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 border-line border-b py-2"
              key={person.user_id}
            >
              <span>
                <span className="font-medium">
                  {memberName(person, locale)}
                </span>
                <span className="type-caption block">
                  {person.has_rsvp ? t("hasRsvp") : t("noRsvp")}
                </span>
              </span>
              <Button
                disabled={checkIn.isPending}
                onClick={() => checkIn.mutate({ target_user: person.user_id })}
                size="sm"
              >
                {t("checkInPerson")}
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
