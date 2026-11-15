"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/brand/components/ui/tabs";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { journal, unwrap } from "@/lib/data";
import { SectionSpinner } from "../../states";
import {
  AdminHeading,
  type Column,
  DataTable,
  Field,
  SelectInput,
} from "../kit";
import { Board, Decided, Selection } from "./board";
import {
  type Category,
  type PipelineIssue,
  pipelineKey,
  type SubmissionStatus,
  useBlindEntries,
  usePipelineIssues,
} from "./data";
import { EntryLink } from "./entry-link";
import { IntakeQueue, Readers } from "./intake";

/** The reader's own assignments for the issue, with their score if sent. */
const MyReads = ({ issueId }: { issueId: string }) => {
  const t = useTranslations("diwan.admin.pipeline");
  const tj = useTranslations("diwan.admin.journal");
  const ts = useTranslations("diwan.journal.status");
  const { supabase, user } = useAuth();
  const reads = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("assignments")
          .select(
            "id, read_number, entry:blind_entries!inner(id, blind_id, title, category, status, issue_id), score:scores(total)"
          )
          .eq("reader_id", user?.id ?? "")
          .eq("entry.issue_id", issueId)
          .order("assigned_at")
      ) ?? [],
    queryKey: [...pipelineKey, "reads", issueId, user?.id],
  });
  type Row = NonNullable<typeof reads.data>[number];
  const columns: Column<Row>[] = [
    {
      cell: (r) => <span className="type-code">{r.entry.blind_id}</span>,
      header: t("columns.blindId"),
      key: "blind",
    },
    {
      cell: (r) => <EntryLink id={r.entry.id} label={r.entry.title} />,
      header: t("columns.title"),
      key: "title",
    },
    {
      cell: (r) => tj(`categories.${r.entry.category as Category}`),
      header: t("columns.category"),
      key: "category",
    },
    {
      cell: (r) => t("readNumber", { number: formatNumber(r.read_number) }),
      header: t("columns.read"),
      key: "read",
    },
    {
      cell: (r) =>
        typeof r.score?.total === "number"
          ? t("scored", { total: formatNumber(r.score.total) })
          : ts(r.entry.status as SubmissionStatus),
      header: t("columns.yourScore"),
      key: "score",
    },
  ];
  return reads.data ? (
    <div className="grid gap-3">
      <p className="type-caption">{t("reading.note")}</p>
      <DataTable
        columns={columns}
        empty={t("reading.empty")}
        rowKey={(r) => r.id}
        rows={reads.data}
      />
    </div>
  ) : (
    <SectionSpinner />
  );
};

/** Advisory Board: flagged pieces only (RLS returns nothing else). */
const Flagged = ({ issueId }: { issueId: string }) => {
  const t = useTranslations("diwan.admin.pipeline");
  const tj = useTranslations("diwan.admin.journal");
  const entries = useBlindEntries(issueId);
  const flagged = entries.data?.filter((e) => e.flagged) ?? [];
  type Row = (typeof flagged)[number];
  const columns: Column<Row>[] = [
    {
      cell: (e) => <span className="type-code">{e.blind_id}</span>,
      header: t("columns.blindId"),
      key: "blind",
    },
    {
      cell: (e) => <EntryLink id={e.id} label={e.title} />,
      header: t("columns.title"),
      key: "title",
    },
    {
      cell: (e) => tj(`categories.${e.category as Category}`),
      header: t("columns.category"),
      key: "category",
    },
    {
      cell: (e) => e.flag_note ?? "—",
      header: t("columns.flagNote"),
      key: "note",
    },
  ];
  return entries.data ? (
    <DataTable
      columns={columns}
      empty={t("flagged.empty")}
      rowKey={(e) => e.id}
      rows={flagged}
    />
  ) : (
    <SectionSpinner />
  );
};

/**
 * The reading queue's stages (decisions.md, The site: Diwan → Qirtas →
 * Editions): Intake, Reading, Decide and Decided, each shown to whoever
 * has a part in it; the Advisory Board's flagged pieces after them. Blind
 * reading and who sees names are unchanged: each part reads only its own.
 */
type Stage = "intake" | "reading" | "decide" | "decided" | "flagged";

const stagesFor = (issue: PipelineIssue): Stage[] => {
  const editor = issue.can_manage || issue.can_decide;
  const stages: [Stage, boolean][] = [
    ["intake", issue.can_identity],
    ["reading", issue.can_review || editor],
    ["decide", editor],
    ["decided", editor || issue.can_identity],
    ["flagged", issue.can_advise],
  ];
  return stages.filter(([, shown]) => shown).map(([key]) => key);
};

const StageBody = ({
  issue,
  stage,
}: {
  issue: PipelineIssue;
  stage: Stage;
}) => {
  const editor = issue.can_manage || issue.can_decide;
  switch (stage) {
    case "intake":
      return (
        <div className="grid gap-10">
          <IntakeQueue issueId={issue.id} />
          <Readers issueId={issue.id} />
        </div>
      );
    case "reading":
      return (
        <div className="grid gap-10">
          {issue.can_review ? <MyReads issueId={issue.id} /> : null}
          {editor ? <Board issueId={issue.id} /> : null}
        </div>
      );
    case "decide":
      return <Selection canDecide={issue.can_decide} issueId={issue.id} />;
    case "decided":
      return <Decided issueId={issue.id} />;
    default:
      return <Flagged issueId={issue.id} />;
  }
};

/**
 * The one reading queue across every call (decisions.md, The site: Diwan
 * → Qirtas → Editions), filtered by Edition; `embedded` on the
 * Editions tab (no heading of its own).
 */
export const PipelineAdmin = ({ embedded = false }: { embedded?: boolean }) => {
  const t = useTranslations("diwan.admin.pipeline");
  const tj = useTranslations("diwan.admin.journal");
  const locale = useLocale() as Locale;
  const cite = useTranslations("web.journal.citation");
  const issues = usePipelineIssues();
  const [chosen, setChosen] = useState("");
  const issue =
    issues.data?.find((i) => i.id === chosen) ?? issues.data?.[0] ?? null;
  const stages = issue ? stagesFor(issue) : [];

  return (
    <div className="grid gap-6">
      {embedded ? (
        <div className="grid gap-2">
          <h2 className="type-heading font-light">{t("title")}</h2>
          <p className="type-body text-text-secondary max-w-3xl">{t("lede")}</p>
        </div>
      ) : (
        <AdminHeading title={t("title")}>{t("lede")}</AdminHeading>
      )}
      {issues.data ? null : <SectionSpinner />}
      {issues.data && !issue ? <p>{t("noIssues")}</p> : null}
      {issue ? (
        <>
          <Field label={tj("columns.issue")}>
            {(id) => (
              <SelectInput
                className="w-80"
                id={id}
                onChange={(e) => setChosen(e.target.value)}
                value={issue.id}
              >
                {issues.data?.map((i) => (
                  <option key={i.id} value={i.id}>
                    {journal.editionCitation(cite, i, locale)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <Tabs defaultValue={stages[0]} key={issue.id}>
            <TabsList className="flex-wrap">
              {stages.map((stage) => (
                <TabsTrigger key={stage} value={stage}>
                  {t(`stages.${stage}`)}
                </TabsTrigger>
              ))}
            </TabsList>
            {stages.map((stage) => (
              <TabsContent className="pt-4" key={stage} value={stage}>
                <StageBody issue={issue} stage={stage} />
              </TabsContent>
            ))}
          </Tabs>
        </>
      ) : null}
    </div>
  );
};
