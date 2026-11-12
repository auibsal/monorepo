"use client";

import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Label } from "@repo/brand/components/ui/label";
import { Textarea } from "@repo/brand/components/ui/textarea";
import { formatNumber } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { journal, unwrap } from "@/lib/data";
import { Link } from "@/lib/diwan/navigation";
import { useQueryParam } from "@/lib/diwan/use-query-param";
import { SectionSpinner } from "../../states";
import {
  AdminHeading,
  ConfirmAction,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";
import { AuthorName } from "./board";
import { type Category, pipelineKey, usePipelineIssues } from "./data";
import { ReadingRoom } from "./reading-room";

type Decision = "accept" | "accept_with_edits" | "decline" | "revise";
const DECISIONS: Decision[] = ["accept", "accept_with_edits", "decline"];
const POINTS = [1, 2, 3, 4, 5];

const useEntry = (id: string | null) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(id),
    queryFn: async () => {
      const [entry, decision] = await Promise.all([
        supabase
          .schema("journal")
          .from("blind_entries")
          .select(
            "id, blind_id, call_id, issue_id, category, language, title, status, editor_notes, flagged, flag_note, created_at, updated_at, desk, revision_requested_at, assignments(id, read_number, reader_id, score:scores(total, craft, voice, depth, archive_factor, comment))"
          )
          .eq("id", id ?? "")
          .maybeSingle(),
        supabase
          .schema("journal")
          .from("decisions")
          .select("decision, notes, decided_at")
          .eq("blind_entry_id", id ?? "")
          .maybeSingle(),
      ]);
      return { decision: unwrap(decision), entry: unwrap(entry) };
    },
    queryKey: [...pipelineKey, "entry", id],
  });
};

type EntryData = NonNullable<
  NonNullable<ReturnType<typeof useEntry>["data"]>["entry"]
>;
type Assignment = EntryData["assignments"][number];

/** Rubric v2, scored by the assigned reader. */
const ScoreForm = ({
  assignment,
  open,
}: {
  assignment: Assignment;
  open: boolean;
}) => {
  const t = useTranslations("diwan.admin.pipeline");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [score, setScore] = useState({
    archive_factor: assignment.score?.archive_factor ?? 0,
    comment: assignment.score?.comment ?? "",
    craft: assignment.score?.craft ?? 0,
    depth: assignment.score?.depth ?? 0,
    voice: assignment.score?.voice ?? 0,
  });
  const complete = journal.criteria.every((c) => score[c] > 0);
  const save = useMutation({
    mutationFn: () =>
      journal.submitScore(supabase, assignment.id, {
        ...score,
        comment: score.comment || undefined,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pipelineKey }),
  });
  const total = complete ? journal.rubricTotal(score) : null;

  return (
    <section className="grid gap-4">
      <h2 className="type-subheading">
        {t("entry.yourRead", { number: formatNumber(assignment.read_number) })}
      </h2>
      <p className="type-caption">{t("entry.rubricNote")}</p>
      <form
        className="grid max-w-3xl gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {journal.criteria.map((c) => (
            <Field
              key={c}
              label={t(`rubric.${c}`, {
                weight: formatNumber(journal.rubric[c].weight),
              })}
            >
              {(id) => (
                <SelectInput
                  disabled={!open}
                  id={id}
                  onChange={(e) =>
                    setScore((s) => ({ ...s, [c]: Number(e.target.value) }))
                  }
                  value={score[c]}
                >
                  <option value={0}>{t("rubric.choose")}</option>
                  {POINTS.map((p) => (
                    <option key={p} value={p}>
                      {formatNumber(p)}
                    </option>
                  ))}
                </SelectInput>
              )}
            </Field>
          ))}
        </div>
        <Field label={t("rubric.comment")}>
          {(id) => (
            <Textarea
              disabled={!open}
              id={id}
              maxLength={4000}
              onChange={(e) =>
                setScore((s) => ({ ...s, comment: e.target.value }))
              }
              rows={4}
              value={score.comment}
            />
          )}
        </Field>
        <p aria-live="polite" className="font-medium">
          {total === null
            ? t("rubric.incomplete")
            : t("rubric.total", {
                band: t(`bands.${journal.band(total)}`),
                total: formatNumber(total),
              })}
        </p>
        {open ? (
          <SaveButton
            disabled={!complete}
            pending={save.isPending}
            success={save.isSuccess}
          />
        ) : (
          <p className="type-caption">{t("entry.scoresClosed")}</p>
        )}
        <ErrorLine error={save.error} />
      </form>
    </section>
  );
};

/** Editors: every read, notes, and the Advisory Board flag. */
const EditorPanel = ({ entry }: { entry: EntryData }) => {
  const t = useTranslations("diwan.admin.pipeline");
  const id = useId();
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    editor_notes: "",
    flag_note: "",
    flagged: false,
  });
  useEffect(() => {
    setForm({
      editor_notes: entry.editor_notes ?? "",
      flag_note: entry.flag_note ?? "",
      flagged: entry.flagged,
    });
  }, [entry]);
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("blind_entries")
          .update({
            editor_notes: form.editor_notes || null,
            flag_note: form.flagged ? form.flag_note || null : null,
            flagged: form.flagged,
          })
          .eq("id", entry.id)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pipelineKey }),
  });
  const reads = [...entry.assignments].sort(
    (a, b) => a.read_number - b.read_number
  );

  return (
    <section className="grid gap-4">
      <h2 className="type-subheading">{t("entry.reads")}</h2>
      {reads.length === 0 ? <p>{t("entry.noReads")}</p> : null}
      <ul className="grid gap-3">
        {reads.map((a) => (
          <li className="border-line grid gap-1 border-t p-4" key={a.id}>
            <p className="font-medium">
              {t("readNumber", { number: formatNumber(a.read_number) })}:{" "}
              {typeof a.score?.total === "number"
                ? t("rubric.total", {
                    band: t(`bands.${journal.band(a.score.total)}`),
                    total: formatNumber(a.score.total),
                  })
                : t("entry.notScored")}
            </p>
            {a.score ? (
              <p className="type-caption">
                {journal.criteria
                  .map(
                    (c) =>
                      `${t(`rubric.${c}`, { weight: formatNumber(journal.rubric[c].weight) })}: ${formatNumber(a.score?.[c] ?? 0)}`
                  )
                  .join(" · ")}
              </p>
            ) : null}
            {a.score?.comment ? (
              <p className="whitespace-pre-wrap">{a.score.comment}</p>
            ) : null}
          </li>
        ))}
      </ul>
      <form
        className="grid max-w-3xl gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <Field label={t("entry.editorNotes")}>
          {(fieldId) => (
            <Textarea
              id={fieldId}
              onChange={(e) =>
                setForm((f) => ({ ...f, editor_notes: e.target.value }))
              }
              rows={3}
              value={form.editor_notes}
            />
          )}
        </Field>
        <div className="flex items-start gap-3">
          <Checkbox
            checked={form.flagged}
            id={`${id}-flag`}
            onCheckedChange={(v) =>
              setForm((f) => ({ ...f, flagged: v === true }))
            }
          />
          <Label className="leading-normal" htmlFor={`${id}-flag`}>
            {t("entry.flag")}
          </Label>
        </div>
        {form.flagged ? (
          <Field label={t("columns.flagNote")}>
            {(fieldId) => (
              <Textarea
                id={fieldId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, flag_note: e.target.value }))
                }
                rows={2}
                value={form.flag_note}
              />
            )}
          </Field>
        ) : null}
        <SaveButton pending={save.isPending} success={save.isSuccess} />
        <ErrorLine error={save.error} />
      </form>
    </section>
  );
};

const DecisionPanel = ({
  canRevise,
  entryId,
}: {
  canRevise: boolean;
  entryId: string;
}) => {
  const t = useTranslations("diwan.admin.pipeline");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<Decision>("accept");
  const [notes, setNotes] = useState("");
  const decide = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("journal").rpc("decide", {
          blind_entry_id: entryId,
          decision,
          notes: notes.trim(),
        })
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pipelineKey }),
  });
  return (
    <section className="grid max-w-3xl gap-4">
      <h2 className="type-subheading">{t("entry.decide")}</h2>
      <p className="type-caption">
        {t(decision === "revise" ? "entry.reviseNote" : "entry.decideNote")}
      </p>
      <Field label={t("columns.decision")}>
        {(id) => (
          <SelectInput
            className="w-72"
            id={id}
            onChange={(e) => setDecision(e.target.value as Decision)}
            value={decision}
          >
            {(canRevise ? [...DECISIONS, "revise" as const] : DECISIONS).map(
              (d) => (
                <option key={d} value={d}>
                  {t(`decisions.${d}`)}
                </option>
              )
            )}
          </SelectInput>
        )}
      </Field>
      <Field label={t("entry.decisionNotes")}>
        {(id) => (
          <Textarea
            id={id}
            maxLength={4000}
            onChange={(e) => setNotes(e.target.value)}
            required
            rows={3}
            value={notes}
          />
        )}
      </Field>
      {notes.trim() ? null : (
        <p className="type-caption">{t("entry.reasonNeeded")}</p>
      )}
      <div>
        <ConfirmAction
          confirmLabel={t(`decisions.${decision}`)}
          description={t("entry.decideConfirm")}
          disabled={decide.isPending || !notes.trim()}
          onConfirm={() => decide.mutate()}
          variant="default"
        >
          {t("entry.record")}
        </ConfirmAction>
      </div>
      <ErrorLine error={decide.error} />
    </section>
  );
};

export const EntryView = () => {
  const t = useTranslations("diwan.admin.pipeline");
  const tj = useTranslations("diwan.admin.journal");
  const ts = useTranslations("diwan.journal.status");
  const tk = useTranslations("diwan.admin.kit");
  const id = useQueryParam("id");
  const { user } = useAuth();
  const data = useEntry(id);
  const issues = usePipelineIssues();

  const back = (
    <Link className="text-sm underline underline-offset-4" href={"/qirtas"}>
      {tk("back")}
    </Link>
  );
  if (data.isPending && id) {
    return <SectionSpinner />;
  }
  const entry = data.data?.entry;
  if (!entry) {
    return (
      <div className="grid gap-4">
        <AdminHeading actions={back} title={t("entry.title")} />
        <p>{t("entry.notFound")}</p>
      </div>
    );
  }
  const issue = issues.data?.find((i) => i.id === entry.issue_id);
  const isEditor = Boolean(issue?.can_manage || issue?.can_decide);
  const mine = entry.assignments.find((a) => a.reader_id === user?.id);
  const decision = data.data?.decision;
  const scoring = entry.status === "in_review" || entry.status === "third_read";

  return (
    <div className="grid gap-8">
      <AdminHeading actions={back} title={entry.title}>
        <span className="type-code">{entry.blind_id}</span> ·{" "}
        {tj(`categories.${entry.category as Category}`)} ·{" "}
        {tj(`languages.${entry.language}`)} · {ts(entry.status)}
      </AdminHeading>

      {decision ? (
        <section className="border-line grid gap-2 border-t p-4">
          <p className="font-medium">
            {t(`decisions.${decision.decision as Decision}`)}
          </p>
          {decision.notes ? (
            <p className="whitespace-pre-wrap">{decision.notes}</p>
          ) : null}
          <p>
            {t("entry.author")}: <AuthorName entryId={entry.id} />
          </p>
        </section>
      ) : null}

      {entry.revision_requested_at ? (
        <p className="type-caption" role="status">
          {t(
            entry.status === "intake_check"
              ? "entry.withWriter"
              : "entry.revised"
          )}
        </p>
      ) : null}

      {entry.flagged && entry.flag_note ? (
        <section className="grid gap-1">
          <h2 className="type-subheading">{t("columns.flagNote")}</h2>
          <p className="whitespace-pre-wrap">{entry.flag_note}</p>
        </section>
      ) : null}

      <ReadingRoom entryId={entry.id} language={entry.language} />

      {mine ? <ScoreForm assignment={mine} open={scoring} /> : null}
      {isEditor ? <EditorPanel entry={entry} /> : null}
      {issue?.can_decide && entry.status === "selection" && !decision ? (
        <DecisionPanel
          canRevise={!entry.revision_requested_at}
          entryId={entry.id}
        />
      ) : null}
    </div>
  );
};
