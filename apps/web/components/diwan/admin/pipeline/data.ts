"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { useAuth } from "@/lib/auth/provider";
import { journal, unwrap } from "@/lib/data";
import { callApi } from "@/lib/diwan/api";

export type SubmissionStatus = journal.SubmissionStatus;
export type Category = journal.Category;

export const pipelineKey = ["admin", "pipeline"];

/**
 * The call the reading queue is filtered to (decisions.md, The site:
 * Diwan → Qirtas → Editions), or every call of the Edition ("").
 */
export const PipelineCall = createContext("");
export const usePipelineCall = () => useContext(PipelineCall);

/** Issues the member has a part in, with what they may do in each. */
export const usePipelineIssues = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(await supabase.schema("journal").rpc("pipeline_issues")) ?? [],
    queryKey: [...pipelineKey, "issues"],
  });
};

export type PipelineIssue = NonNullable<
  ReturnType<typeof usePipelineIssues>["data"]
>[number];

/** Blind entries for an issue with their reads (editors see every score). */
export const useBlindEntries = (issueId: string, enabled = true) => {
  const { supabase } = useAuth();
  const callId = usePipelineCall();
  return useQuery({
    enabled: enabled && Boolean(issueId),
    queryFn: async () => {
      const query = supabase
        .schema("journal")
        .from("blind_entries")
        .select(
          "id, blind_id, title, category, language, status, flagged, flag_note, updated_at, assignments(id, reader_id, read_number, score:scores(total))"
        )
        .eq("issue_id", issueId);
      return (
        unwrap(
          await (callId ? query.eq("call_id", callId) : query).order(
            "created_at"
          )
        ) ?? []
      );
    },
    queryKey: [...pipelineKey, "entries", issueId, callId],
  });
};

export type BlindEntryRow = NonNullable<
  ReturnType<typeof useBlindEntries>["data"]
>[number];

/** Read totals in read order (1, 2, then the third read). */
export const readTotals = (entry: Pick<BlindEntryRow, "assignments">) =>
  [...entry.assignments]
    .sort((a, b) => a.read_number - b.read_number)
    .map((a) => a.score?.total ?? null);

export const entryAverage = (entry: Pick<BlindEntryRow, "assignments">) =>
  journal.averageTotal(readTotals(entry));

export const openSubmissionFile = async (
  supabase: ReturnType<typeof useAuth>["supabase"],
  id: string
) => {
  const { url } = await callApi<{ url: string }>(
    supabase,
    "/files/submission",
    { id }
  );
  window.open(url, "_blank", "noopener,noreferrer");
};
