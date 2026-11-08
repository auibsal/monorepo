"use client";

import type { Locale } from "@repo/internationalization";
import { formatDateTime } from "@repo/internationalization/format";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { DiwanSection, RowList } from "../page";
import { useMemberNames } from "./member-picker";
import { memberName } from "./members/directory";

/** The records with a history (`private.history_tables()`). */
export type HistoryTable =
  | "events.events"
  | "journal.pieces"
  | "journal.issues"
  | "journal.calls"
  | "journal.award_rounds"
  | "programmes.productions"
  | "programmes.episodes"
  | "governance.partners"
  | "governance.partner_agreements"
  | "governance.elections"
  | "governance.society_documents";

/** Fields named in words; the rest are "other details". */
const FIELDS = [
  "title",
  "deck",
  "body",
  "summary",
  "status",
  "slug",
  "published_at",
  "starts_at",
  "ends_at",
  "location",
  "capacity",
  "entry",
  "is_public",
  "image",
] as const;
type Field = (typeof FIELDS)[number];

const LANGUAGE_SUFFIX = /_(en|ar)$/u;

/** The changed columns as the fields officers know, each once. */
const fieldsOf = (changed: readonly string[]) => {
  const named = new Set<Field>();
  let other = false;
  for (const column of changed) {
    const base = column.replace(LANGUAGE_SUFFIX, "");
    const field = FIELDS.find((f) => f === base || base.startsWith(`${f}_`));
    if (field) {
      named.add(field);
    } else {
      other = true;
    }
  }
  return { named: [...named], other };
};

/**
 * A record's history on its own page in the Diwan (the design review C24,
 * Nov 4, 2026): who added or changed it and when, and which fields, from
 * the activity log through `core.record_history()`, which never returns
 * the values and answers only an officer who can see the record. Hidden
 * when there is nothing to show.
 */
export const RecordHistory = ({
  id,
  table,
}: {
  /** None yet for a new record: nothing to show. */
  readonly id: string | null | undefined;
  readonly table: HistoryTable;
}) => {
  const t = useTranslations("diwan.admin.history");
  const ta = useTranslations("diwan.admin.activity");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const history = useQuery({
    enabled: Boolean(id),
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("core")
          .rpc("record_history", { record_id: id ?? "", record_table: table })
      ) ?? [],
    queryKey: ["admin", "history", table, id],
  });
  const names = useMemberNames((history.data ?? []).map((e) => e.actor_id));
  if (!history.data?.length) {
    return null;
  }
  const who = (actor: string | null) => {
    const person = names.data?.find((n) => n.id === actor);
    return person ? memberName(person, locale) : ta("platform");
  };
  return (
    <DiwanSection id="history" title={t("title")}>
      <RowList>
        {history.data.map((entry) => {
          const { named, other } = fieldsOf(entry.changed);
          const fields = [
            ...named.map((f) => t(`fields.${f}`)),
            ...(other ? [t("fields.other")] : []),
          ];
          return (
            <li
              className="grid gap-0.5"
              key={`${entry.occurred_at}-${entry.operation}`}
            >
              <p className="type-body">
                {t(`sentence.${entry.operation as "INSERT"}`, {
                  who: who(entry.actor_id),
                })}
                {fields.length > 0
                  ? ` ${t("fieldsList", { fields: fields.join(t("and")) })}`
                  : ""}
              </p>
              <p className="type-caption">
                {formatDateTime(entry.occurred_at, locale)}
              </p>
            </li>
          );
        })}
      </RowList>
    </DiwanSection>
  );
};
