"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatDateTime } from "@repo/internationalization/format";
import { unwrap } from "@repo/sal-data";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { RowList } from "../../page";
import { EmptyLine, SectionSpinner } from "../../states";
import { AdminHeading, Field, SelectInput } from "../kit";
import { useMemberNames } from "../member-picker";
import { memberName } from "../members/directory";

const PAGE = 50;

type Operation = "INSERT" | "UPDATE" | "DELETE";

/**
 * What each logged table holds, in the words officers use, and the part of
 * the Diwan it belongs to. Tables left out (the sync's bookkeeping, settings
 * changed by the platform itself) are not shown.
 */
const THINGS = {
  "access.role_assignments": "people",
  "access.two_step_resets": "people",
  "charity.campaigns": "events",
  "charity.impact_metrics": "events",
  "charity.ledger_entries": "events",
  "charity.ledger_signoffs": "events",
  "charity.receipts": "events",
  "events.check_ins": "events",
  "events.events": "events",
  "events.series_rules": "events",
  "governance.candidates": "society",
  "governance.election_results": "society",
  "governance.elections": "society",
  "governance.library_documents": "society",
  "governance.member_offers": "people",
  "governance.minutes": "society",
  "governance.partner_affiliations": "people",
  "governance.partner_agreements": "people",
  "governance.partner_invitations": "people",
  "governance.partners": "people",
  "governance.resolutions": "society",
  "governance.society_documents": "society",
  "journal.ads": "qirtas",
  "journal.agreements": "qirtas",
  "journal.approvals": "qirtas",
  "journal.calls": "qirtas",
  "journal.corrections": "qirtas",
  "journal.decisions": "qirtas",
  "journal.issues": "qirtas",
  "journal.pieces": "qirtas",
  "journal.prize_entries": "qirtas",
  "journal.prize_rounds": "qirtas",
  "journal.puzzles": "qirtas",
  "membership.activity_records": "people",
  "membership.certificates": "people",
  "membership.guests": "people",
  "membership.memberships": "people",
  "membership.service_records": "people",
  "membership.verification_requests": "people",
  "programmes.episodes": "qirtas",
  "programmes.needs": "events",
  "programmes.opening_replies": "people",
  "programmes.placements": "events",
  "programmes.production_credits": "company",
  "programmes.production_events": "company",
  "programmes.productions": "company",
  "programmes.reels": "qirtas",
  "programmes.removal_requests": "qirtas",
  "programmes.six_words": "events",
} as const;

/**
 * Logged, but not news to officers: permission bundles and settings change
 * with the platform, terms come from the AUIB calendar, and judges and call
 * partners are recorded with their prize or call.
 */
export const LEFT_OUT = [
  "access.role_permissions",
  "core.semesters",
  "core.settings",
  "governance.handbook_pages",
  "journal.call_partners",
  "journal.prize_judges",
] as const;

type Thing = keyof typeof THINGS;
type Area = (typeof THINGS)[Thing];
const AREAS: readonly Area[] = [
  "events",
  "qirtas",
  "company",
  "people",
  "society",
];

const isThing = (name: string): name is Thing => name in THINGS;

/** A record's own name, where it has one (a title, a name, a slug). */
const nameOf = (row: Record<string, unknown> | null, locale: Locale) => {
  if (!row) {
    return "";
  }
  const pick = (key: string) =>
    typeof row[key] === "string" && row[key] ? (row[key] as string) : "";
  return (
    (locale === "ar" && (pick("title_ar") || pick("name_ar"))) ||
    pick("title_en") ||
    pick("name_en") ||
    pick("title") ||
    pick("slug") ||
    ""
  );
};

interface Entry {
  readonly actor_id: string | null;
  readonly id: number;
  readonly new_row: unknown;
  readonly occurred_at: string;
  readonly old_row: unknown;
  readonly operation: string;
  readonly table_name: string;
  readonly table_schema: string;
}

const useActivity = (area: "" | Area, limit = PAGE) => {
  const { supabase } = useAuth();
  return useInfiniteQuery({
    getNextPageParam: (last: Entry[]) =>
      last.length === limit ? (last.at(-1)?.id ?? null) : null,
    initialPageParam: null as number | null,
    queryFn: async ({ pageParam }) => {
      const tables = (Object.keys(THINGS) as Thing[]).filter(
        (thing) => !area || THINGS[thing] === area
      );
      const schemas = [...new Set(tables.map((t) => t.split(".")[0] ?? ""))];
      let query = supabase
        .schema("core")
        .from("activity_log")
        .select(
          "id, table_schema, table_name, operation, actor_id, old_row, new_row, occurred_at"
        )
        .in("table_schema", schemas)
        .in(
          "table_name",
          tables.map((t) => t.split(".")[1] ?? "")
        )
        .order("id", { ascending: false })
        .limit(limit);
      if (pageParam) {
        query = query.lt("id", pageParam);
      }
      return ((unwrap(await query) ?? []) as Entry[]).filter((entry) =>
        isThing(`${entry.table_schema}.${entry.table_name}`)
      );
    },
    queryKey: ["admin", "activity", area, limit],
  });
};

/**
 * What happened, in sentences: who did what to which record, newest first
 * ("Lina changed the event “Open Pages”"). The Desk shows the latest few;
 * the full page filters by section.
 */
const Feed = ({ entries }: { readonly entries: readonly Entry[] }) => {
  const t = useTranslations("nexus.admin.activity");
  const locale = useLocale() as Locale;
  const names = useMemberNames(entries.map((e) => e.actor_id));
  const who = (id: string | null) => {
    const person = names.data?.find((n) => n.id === id);
    return person ? memberName(person, locale) : t("platform");
  };
  return (
    <RowList>
      {entries.map((entry) => {
        const thing = `${entry.table_schema}.${entry.table_name}` as Thing;
        const row = (entry.new_row ?? entry.old_row) as Record<
          string,
          unknown
        > | null;
        const name = nameOf(row, locale);
        const verb = entry.operation as Operation;
        return (
          <li className="grid gap-0.5" key={entry.id}>
            <p className="type-body">
              {t(`sentence.${verb}`, {
                name: name ? t("named", { name }) : "",
                thing: t(`things.${thing.replace(".", "_")}` as never),
                who: who(entry.actor_id),
              })}
            </p>
            <p className="type-caption">
              {formatDateTime(entry.occurred_at, locale)}
            </p>
          </li>
        );
      })}
    </RowList>
  );
};

/** The Desk's few latest, with the way to the rest. */
export const RecentActivity = () => {
  const t = useTranslations("nexus.admin.activity");
  const log = useActivity("", 6);
  if (log.isPending) {
    return <SectionSpinner />;
  }
  const entries = log.data?.pages[0] ?? [];
  return entries.length === 0 ? (
    <EmptyLine>{t("none")}</EmptyLine>
  ) : (
    <Feed entries={entries} />
  );
};

export const ActivityLog = () => {
  const t = useTranslations("nexus.admin.activity");
  const ts = useTranslations("nexus.admin.sections");
  const [area, setArea] = useState<"" | Area>("");
  const log = useActivity(area);
  const entries = log.data?.pages.flat() ?? [];

  return (
    <div className="grid gap-6">
      <AdminHeading title={t("title")}>{t("lede")}</AdminHeading>
      <Field label={t("area")}>
        {(id) => (
          <SelectInput
            className="max-w-xs"
            id={id}
            onChange={(e) => setArea(e.target.value as "" | Area)}
            value={area}
          >
            <option value="">{t("everywhere")}</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {ts(a)}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
      {log.isPending ? <SectionSpinner /> : null}
      {log.isSuccess && entries.length === 0 ? (
        <EmptyLine>{t("none")}</EmptyLine>
      ) : (
        <Feed entries={entries} />
      )}
      {log.hasNextPage ? (
        <Button
          className="justify-self-start"
          disabled={log.isFetchingNextPage}
          onClick={() => log.fetchNextPage()}
          variant="link"
        >
          {t("more")}
        </Button>
      ) : null}
    </div>
  );
};
