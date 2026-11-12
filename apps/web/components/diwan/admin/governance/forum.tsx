"use client";

import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { localized, unwrap } from "@/lib/data";
import { ChoiceInput } from "../choice-input";
import { ErrorLine, SaveButton } from "../kit";

const WEEK = 7 * 864e5;

/**
 * The candidates' forum (decisions.md, Governance): an event made in
 * Notion like any other, in the seven days before voting opens; the
 * Committee names it here, and its recording goes on the event's links
 * from the night.
 */
export const CandidatesForum = ({
  election,
  onSaved,
}: {
  readonly election: {
    forum_event_id: string | null;
    id: string;
    voting_opens_at: string;
  };
  readonly onSaved: () => void;
}) => {
  const t = useTranslations("diwan.admin.governance.elections.forum");
  const locale = useLocale() as "en" | "ar";
  const { supabase } = useAuth();
  const id = useId();
  const [chosen, setChosen] = useState(election.forum_event_id ?? "");
  const opens = new Date(election.voting_opens_at).getTime();
  const events = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .from("events")
          .select("id, title_en, title_ar, starts_at")
          .neq("status", "draft")
          .gte("starts_at", new Date(opens - WEEK).toISOString())
          .lt("starts_at", election.voting_opens_at)
          .order("starts_at")
      ) ?? [],
    queryKey: ["admin", "forum-events", election.id],
  });
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("elections")
          .update({ forum_event_id: chosen || null })
          .eq("id", election.id)
      ),
    onSuccess: onSaved,
  });

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <h4 className="text-sm font-medium">{t("title")}</h4>
      <p className="type-caption">{t("hint")}</p>
      {events.data && events.data.length === 0 ? (
        <p className="type-body">{t("none")}</p>
      ) : (
        <ChoiceInput
          aria-label={t("title")}
          id={id}
          onChange={(e) => setChosen(e.target.value)}
          value={chosen}
        >
          <option value="">{t("notYet")}</option>
          {(events.data ?? []).map((e) => (
            <option key={e.id} value={e.id}>
              {`${localized(e, "title", locale)} · ${formatLongDate(e.starts_at, locale)}, ${formatClock(e.starts_at, locale)}`}
            </option>
          ))}
        </ChoiceInput>
      )}
      <div className="flex flex-wrap gap-3">
        <SaveButton pending={save.isPending} quiet success={save.isSuccess} />
      </div>
      <ErrorLine error={save.error} />
    </form>
  );
};
