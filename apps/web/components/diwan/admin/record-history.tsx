"use client";

import type { Locale } from "@repo/internationalization";
import { formatDateTime } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { versionPreview } from "@/lib/data/versions";
import { DiwanSection, RowList } from "../page";
import { ErrorLine } from "./kit";
import { useMemberNames } from "./member-picker";
import { memberName } from "./members/directory";

/** The records with a history (`private.history_tables()`). */
export type HistoryTable =
  | "events.events"
  | "journal.pieces"
  | "journal.issues"
  | "journal.calls"
  | "journal.story_assignments"
  | "journal.award_rounds"
  | "programs.openings"
  | "core.announcements"
  | "core.presets"
  | "content.media_items"
  | "programs.productions"
  | "programs.episodes"
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
  versions,
}: {
  /** None yet for a new record: nothing to show. */
  readonly id: string | null | undefined;
  readonly table: HistoryTable;
  /** The texts whose earlier versions it keeps, restored from here. */
  readonly versions?: VersionTable;
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
          .schema("api")
          .rpc("record_history", { record_id: id ?? "", record_table: table })
      ) ?? [],
    queryKey: ["admin", "history", table, id],
  });
  const names = useMemberNames((history.data ?? []).map((e) => e.actor_id));
  const earlier =
    versions && id ? <EarlierVersions id={id} table={versions} /> : null;
  if (!history.data?.length) {
    return earlier;
  }
  const who = (actor: string | null) => {
    const person = names.data?.find((n) => n.id === actor);
    return person ? memberName(person, locale) : ta("platform");
  };
  return (
    <>
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
      {earlier}
    </>
  );
};

/** The texts that keep earlier versions (`private.keep_version`). */
export type VersionTable =
  | "core.programs"
  | "events.events"
  | "governance.partners"
  | "governance.society_documents"
  | "journal.piece_bodies"
  | "programs.episodes"
  | "programs.openings"
  | "programs.productions";

/** Where each is saved through the Data API, and its key. */
const VERSION_TARGETS = {
  "core.programs": ["programs", "id"],
  "events.events": ["events", "id"],
  "governance.partners": ["partners", "id"],
  "governance.society_documents": ["society_documents", "id"],
  "journal.piece_bodies": ["piece_bodies", "piece_id"],
  "programs.episodes": ["episodes", "id"],
  "programs.openings": ["openings", "id"],
  "programs.productions": ["productions", "id"],
} as const satisfies Record<VersionTable, readonly [string, string]>;

/**
 * Earlier versions of a record's text (decisions.md, The site: "History"):
 * each save keeps the words it replaced, the last 50; Restore saves one
 * again, so the record's own rules decide and the restore is itself kept.
 */
const EarlierVersions = ({
  id,
  table,
}: {
  readonly id: string;
  readonly table: VersionTable;
}) => {
  const t = useTranslations("diwan.admin.history.versions");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const client = useQueryClient();
  const versions = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("api")
          .from("record_versions")
          .select("id, fields, saved_by, saved_at")
          .eq("record_table", table)
          .eq("record_id", id)
          .order("id", { ascending: false })
      ) ?? [],
    queryKey: ["admin", "versions", table, id],
  });
  const names = useMemberNames((versions.data ?? []).map((v) => v.saved_by));
  const restore = useMutation({
    mutationFn: async (fields: Record<string, unknown>) => {
      const [view, key] = VERSION_TARGETS[table];
      unwrap(
        await supabase
          .schema("api")
          // One shape for every target; RLS decides who may save it.
          .from(view as "events")
          .update(fields as never)
          .eq(key as "id", id)
      );
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["admin"] }),
  });
  if (!versions.data?.length) {
    return null;
  }
  return (
    <DiwanSection description={t("lede")} id="versions" title={t("title")}>
      <RowList>
        {versions.data.map((v) => {
          const person = names.data?.find((n) => n.id === v.saved_by);
          return (
            <li className="grid gap-1" key={v.id}>
              <p className="type-caption">
                {t("replaced", {
                  date: formatDateTime(v.saved_at, locale),
                  who: person ? memberName(person, locale) : t("someone"),
                })}
              </p>
              <p className="type-body" dir="auto">
                {versionPreview(v.fields as Record<string, unknown>, locale)}
              </p>
              <button
                className="link justify-self-start"
                disabled={restore.isPending}
                onClick={() =>
                  restore.mutate(v.fields as Record<string, unknown>)
                }
                type="button"
              >
                {t("restore")}
              </button>
            </li>
          );
        })}
      </RowList>
      <ErrorLine error={restore.error} />
    </DiwanSection>
  );
};
