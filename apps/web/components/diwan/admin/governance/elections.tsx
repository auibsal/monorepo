"use client";

import { SalCard } from "@repo/brand/components/sal/card";
import { Button } from "@repo/brand/components/ui/button";
import type { Locale } from "@repo/internationalization";
import {
  formatDateTime,
  formatNumber,
} from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { governance, localized, unwrap } from "@/lib/data";
import { useRouter } from "@/lib/diwan/navigation";
import { SectionSpinner } from "../../states";
import {
  BilingualField,
  ConfirmAction,
  DateTimeField,
  ErrorLine,
  ExportButton,
  NewLink,
  RecordPage,
  SaveButton,
} from "../kit";
import { useMemberNames } from "../member-picker";
import { memberName } from "../members/directory";
import { CandidatesForum } from "./forum";

const key = ["admin", "governance", "elections"];
const EXECUTIVE_ROLES = [
  "president",
  "vice_president",
  "general_secretary",
] as const;

type ElectionStatus =
  | "draft"
  | "notice"
  | "nominations"
  | "review"
  | "voting"
  | "closed"
  | "published";
type CandidateStatus = "nominated" | "approved" | "rejected" | "withdrawn";

interface Count {
  abstained: number;
  tallies: Record<string, number>;
  votes_cast: number;
}

const useElection = (electionId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => {
      const [positions, results, turnout] = await Promise.all([
        supabase
          .schema("governance")
          .from("positions")
          .select("*")
          .eq("election_id", electionId)
          .order("sort"),
        supabase
          .schema("governance")
          .from("election_results")
          .select("*")
          .eq("election_id", electionId),
        supabase
          .schema("governance")
          .rpc("turnout", { election_id: electionId }),
      ]);
      const positionRows = unwrap(positions) ?? [];
      const candidates = positionRows.length
        ? (unwrap(
            await supabase
              .schema("governance")
              .from("candidates")
              .select("*")
              .in(
                "position_id",
                positionRows.map((p) => p.id)
              )
          ) ?? [])
        : [];
      return {
        candidates,
        positions: positionRows,
        results: unwrap(results) ?? [],
        turnout: (turnout.data ?? [])[0] ?? null,
      };
    },
    queryKey: [...key, electionId],
  });
};

const ElectionCard = ({
  election,
}: {
  election: {
    id: string;
    status: string;
    title_ar: string;
    title_en: string;
    eligible_count: number | null;
    forum_event_id: string | null;
    notice_given_at: string | null;
    runoff_of: string | null;
    voting_point_ar: string | null;
    voting_point_at: string | null;
    voting_point_en: string | null;
    voting_closes_at: string;
    voting_opens_at: string;
    nominations_open_at: string;
    nominations_close_at: string;
  };
}) => {
  const t = useTranslations("diwan.admin.governance.elections");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const data = useElection(election.id);
  const names = useMemberNames(
    data.data?.candidates.map((c) => c.user_id) ?? []
  );
  const { data: roles } = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("access")
          .from("roles")
          .select("key, name_en, name_ar")
          .in("key", [...EXECUTIVE_ROLES])
      ) ?? [],
    queryKey: ["admin", "executive-roles"],
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const status = election.status as ElectionStatus;

  const setStatus = useMutation({
    mutationFn: async (next: ElectionStatus) =>
      unwrap(
        await supabase
          .schema("governance")
          .from("elections")
          .update({ status: next })
          .eq("id", election.id)
      ),
    onSuccess: invalidate,
  });
  const giveNotice = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .rpc("give_notice", { election_id: election.id })
      ),
    onSuccess: invalidate,
  });
  const openVoting = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .rpc("open_voting", { election_id: election.id })
      ),
    onSuccess: invalidate,
  });
  const count = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .rpc("count_election", { election_id: election.id })
      ),
    onSuccess: invalidate,
  });
  // No majority: the runoff opens now and closes in two days, within the
  // week after this election closed (decisions §4; private.start_runoff).
  const startRunoff = useMutation({
    mutationFn: async (positionId: string) => {
      const week = Date.parse(election.voting_closes_at) + 7 * 86_400_000;
      const closes = Math.min(Date.now() + 2 * 86_400_000, week - 60_000);
      return unwrap(
        await supabase.schema("governance").rpc("start_runoff", {
          closes_at: new Date(closes).toISOString(),
          election_id: election.id,
          opens_at: new Date().toISOString(),
          position_id: positionId,
        })
      );
    },
    onSuccess: invalidate,
  });
  const recordLot = useMutation({
    mutationFn: async (vars: { candidateId: string; positionId: string }) =>
      unwrap(
        await supabase.schema("governance").rpc("record_lot", {
          candidate_id: vars.candidateId,
          election_id: election.id,
          position_id: vars.positionId,
        })
      ),
    onSuccess: invalidate,
  });
  const decide = useMutation({
    mutationFn: async ({ approve, id }: { approve: boolean; id: string }) =>
      unwrap(
        await supabase
          .schema("governance")
          .rpc("decide_candidate", { approve, candidate_id: id })
      ),
    onSuccess: invalidate,
  });
  // Student Life confirms a GPA of 2.0 or more (decisions.md): it
  // answers only "eligible" or "not eligible", recorded here; no grades.
  const check = useMutation({
    mutationFn: async ({ eligible, id }: { eligible: boolean; id: string }) =>
      unwrap(
        await supabase
          .schema("governance")
          .rpc("record_gpa_check", { candidate_id: id, eligible })
      ),
    onSuccess: invalidate,
  });
  const addPositions = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("positions")
          .insert(
            EXECUTIVE_ROLES.map((role, index) => {
              const r = roles?.find((x) => x.key === role);
              return {
                election_id: election.id,
                role_key: role,
                sort: index,
                title_ar: r?.name_ar ?? role,
                title_en: r?.name_en ?? role,
              };
            })
          )
      ),
    onSuccess: invalidate,
  });

  const candidateName = (candidateId: string) => {
    if (candidateId === governance.RON) {
      return t("ron");
    }
    const candidate = data.data?.candidates.find((c) => c.id === candidateId);
    const person = names.data?.find((n) => n.id === candidate?.user_id);
    return person ? memberName(person, locale) : "—";
  };

  return (
    <SalCard>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="type-subheading">
          {localized(election, "title", locale)}
        </h3>
        <p className="text-text font-medium">{t(`statuses.${status}`)}</p>
      </div>
      <p className="type-caption">
        {t("nominationsOpen")}:{" "}
        {formatDateTime(election.nominations_open_at, locale)} ·{" "}
        {t("votingOpens")}: {formatDateTime(election.voting_opens_at, locale)} ·{" "}
        {t("votingCloses")}: {formatDateTime(election.voting_closes_at, locale)}
      </p>
      {election.notice_given_at ? (
        <p className="type-caption">
          {t("noticeGiven", {
            count: election.eligible_count ?? 0,
            date: formatDateTime(election.notice_given_at, locale),
            n: formatNumber(election.eligible_count ?? 0),
          })}
        </p>
      ) : null}
      {data.data?.turnout ? (
        <p className="font-medium">
          {t("turnout", {
            eligible: formatNumber(data.data.turnout.eligible),
            voted: formatNumber(data.data.turnout.voted),
          })}
        </p>
      ) : null}

      {data.isPending ? <SectionSpinner /> : null}
      <ErrorLine error={check.error ?? decide.error} />
      <section className="grid gap-3">
        <h4 className="text-sm font-medium">{t("positions")}</h4>
        {data.data && data.data.positions.length === 0 && status === "draft" ? (
          <Button
            className="justify-self-start"
            disabled={addPositions.isPending}
            onClick={() => addPositions.mutate()}
            size="sm"
            variant="outline"
          >
            {t("addPositions")}
          </Button>
        ) : null}
        {data.data?.positions.map((position) => {
          const candidates = data.data.candidates.filter(
            (c) => c.position_id === position.id
          );
          const result = data.data.results.find(
            (r) => r.position_id === position.id
          );
          return (
            <div
              className="border-line grid gap-2 border-b pb-3"
              key={position.id}
            >
              <p className="font-medium">
                {localized(position, "title", locale)}
              </p>
              {candidates.length === 0 ? (
                <p className="type-caption">{t("noCandidates")}</p>
              ) : null}
              <ul className="grid gap-2">
                {candidates.map((c) => (
                  <li className="grid gap-1" key={c.id}>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-medium">{candidateName(c.id)}</span>
                      <span className="type-caption">
                        {t(`candidateStatuses.${c.status as CandidateStatus}`)}
                      </span>
                      <span className="type-caption">
                        {c.student_life_answer
                          ? t(
                              `studentLife.${c.student_life_answer as "eligible"}`
                            )
                          : t("studentLife.waiting")}
                      </span>
                      {(status === "nominations" || status === "review") &&
                      !c.student_life_answer ? (
                        <>
                          <Button
                            disabled={check.isPending}
                            onClick={() =>
                              check.mutate({ eligible: true, id: c.id })
                            }
                            size="sm"
                            variant="ghost"
                          >
                            {t("studentLife.markEligible")}
                          </Button>
                          <Button
                            disabled={check.isPending}
                            onClick={() =>
                              check.mutate({ eligible: false, id: c.id })
                            }
                            size="sm"
                            variant="ghost"
                          >
                            {t("studentLife.markNotEligible")}
                          </Button>
                        </>
                      ) : null}
                      {(status === "nominations" || status === "review") &&
                      c.student_life_answer === "eligible" ? (
                        <>
                          <Button
                            disabled={decide.isPending}
                            onClick={() =>
                              decide.mutate({ approve: true, id: c.id })
                            }
                            size="sm"
                            variant="ghost"
                          >
                            {t("approveCandidate")}
                          </Button>
                          <Button
                            disabled={decide.isPending}
                            onClick={() =>
                              decide.mutate({ approve: false, id: c.id })
                            }
                            size="sm"
                            variant="ghost"
                          >
                            {t("rejectCandidate")}
                          </Button>
                        </>
                      ) : null}
                    </div>
                    {c.statement_en || c.statement_ar ? (
                      <p className="type-caption whitespace-pre-line">
                        {localized(c, "statement", locale)}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
              {result ? (
                <ElectionResult
                  candidateName={candidateName}
                  isRunoff={Boolean(election.runoff_of)}
                  onRecordLot={(candidateId) =>
                    recordLot.mutate({ candidateId, positionId: position.id })
                  }
                  onStartRunoff={() => startRunoff.mutate(position.id)}
                  pending={startRunoff.isPending || recordLot.isPending}
                  result={result}
                />
              ) : null}
            </div>
          );
        })}
      </section>

      {status === "closed" || status === "published" ? null : (
        <>
          <VotingPoint election={election} onSaved={invalidate} />
          <CandidatesForum election={election} onSaved={invalidate} />
        </>
      )}

      <div className="flex flex-wrap gap-3">
        {status === "draft" ? null : (
          <ExportButton
            fileName={`sal-candidates-${election.id.slice(0, 8)}.csv`}
            label={t("studentLifeList")}
            name="student-life-candidates"
            params={{ election_id: election.id }}
          />
        )}
        {status === "draft" ? (
          <ConfirmAction
            confirmLabel={t("giveNotice")}
            description={t("giveNoticeConfirm")}
            disabled={giveNotice.isPending}
            onConfirm={() => giveNotice.mutate()}
            variant="default"
          >
            {t("giveNotice")}
          </ConfirmAction>
        ) : null}
        {status === "notice" ? (
          <Button
            disabled={setStatus.isPending}
            onClick={() => setStatus.mutate("nominations")}
            size="sm"
          >
            {t("openNominations")}
          </Button>
        ) : null}
        {status === "nominations" ? (
          <Button
            disabled={setStatus.isPending}
            onClick={() => setStatus.mutate("review")}
            size="sm"
            variant="outline"
          >
            {t("startReview")}
          </Button>
        ) : null}
        {status === "nominations" || status === "review" ? (
          <ConfirmAction
            confirmLabel={t("openVoting")}
            description={t("openVotingConfirm")}
            disabled={openVoting.isPending}
            onConfirm={() => openVoting.mutate()}
            variant="default"
          >
            {t("openVoting")}
          </ConfirmAction>
        ) : null}
        {status === "voting" ? (
          <ConfirmAction
            confirmLabel={t("count")}
            description={t("countConfirm")}
            disabled={count.isPending}
            onConfirm={() => count.mutate()}
            variant="default"
          >
            {t("count")}
          </ConfirmAction>
        ) : null}
        {status === "closed" ? (
          <ConfirmAction
            confirmLabel={t("publish")}
            description={t("publishConfirm")}
            disabled={setStatus.isPending}
            onConfirm={() => setStatus.mutate("published")}
            variant="default"
          >
            {t("publish")}
          </ConfirmAction>
        ) : null}
      </div>
      <ErrorLine
        error={
          setStatus.error ??
          giveNotice.error ??
          openVoting.error ??
          count.error ??
          decide.error ??
          startRunoff.error ??
          recordLot.error ??
          addPositions.error
        }
      />
    </SalCard>
  );
};

/** Where and when members vote in person, on the same ballot. */
const VotingPoint = ({
  election,
  onSaved,
}: {
  readonly election: {
    id: string;
    voting_point_ar: string | null;
    voting_point_at: string | null;
    voting_point_en: string | null;
  };
  readonly onSaved: () => void;
}) => {
  const t = useTranslations("diwan.admin.governance.elections");
  const { supabase } = useAuth();
  const [point, setPoint] = useState({
    at: election.voting_point_at,
    place: {
      ar: election.voting_point_ar ?? "",
      en: election.voting_point_en ?? "",
    },
  });
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("elections")
          .update({
            voting_point_ar: point.place.ar || null,
            voting_point_at: point.at,
            voting_point_en: point.place.en || null,
          })
          .eq("id", election.id)
      ),
    onSuccess: onSaved,
  });
  return (
    <form
      className="border-line grid gap-3 border-t pt-3"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <BilingualField
        label={t("votingPoint")}
        maxLength={300}
        onChange={(place) => setPoint((p) => ({ ...p, place }))}
        value={point.place}
      />
      <DateTimeField
        label={t("votingPointAt")}
        onChange={(at) => setPoint((p) => ({ ...p, at }))}
        value={point.at}
      />
      <SaveButton pending={save.isPending} success={save.isSuccess} />
      <ErrorLine error={save.error} />
    </form>
  );
};

interface ResultRow {
  decided_by_lot: boolean;
  ron_won: boolean;
  rounds: unknown;
  runoff_candidate_ids: string[] | null;
  winner_candidate_id: string | null;
}

/** One seat's count: the tallies, then who won, a runoff, or the draw. */
const ElectionResult = ({
  candidateName,
  isRunoff,
  onRecordLot,
  onStartRunoff,
  pending,
  result,
}: {
  readonly candidateName: (id: string) => string;
  readonly isRunoff: boolean;
  readonly onRecordLot: (candidateId: string) => void;
  readonly onStartRunoff: () => void;
  readonly pending: boolean;
  readonly result: ResultRow;
}) => {
  const t = useTranslations("diwan.admin.governance.elections");
  const counts = (Array.isArray(result.rounds) ? result.rounds : []) as Count[];
  const tied = result.runoff_candidate_ids ?? [];
  let outcome: string;
  if (result.ron_won) {
    outcome = t("ronWon");
  } else if (result.winner_candidate_id) {
    outcome = result.decided_by_lot
      ? t("byLot", { name: candidateName(result.winner_candidate_id) })
      : t("winner", { name: candidateName(result.winner_candidate_id) });
  } else if (tied.length > 0 && isRunoff) {
    outcome = t("tiedDraw");
  } else if (tied.length > 0) {
    outcome = t("runoffDue", { names: tied.map(candidateName).join(", ") });
  } else {
    outcome = t("winner", { name: "—" });
  }
  return (
    <div className="grid gap-2">
      <p className="text-text font-medium">{outcome}</p>
      {counts.map((count) => (
        <p className="type-caption" key="count">
          {t("tally", {
            abstained: formatNumber(count.abstained),
            tallies: Object.entries(count.tallies)
              .map(
                ([id, votes]) => `${candidateName(id)} ${formatNumber(votes)}`
              )
              .join(" · "),
          })}
        </p>
      ))}
      {!(result.winner_candidate_id || result.ron_won) && tied.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {isRunoff ? (
            tied.map((id) => (
              <ConfirmAction
                confirmLabel={t("recordLot", { name: candidateName(id) })}
                description={t("recordLotConfirm", { name: candidateName(id) })}
                disabled={pending}
                key={id}
                onConfirm={() => onRecordLot(id)}
              >
                {t("recordLot", { name: candidateName(id) })}
              </ConfirmAction>
            ))
          ) : (
            <ConfirmAction
              confirmLabel={t("startRunoff")}
              description={t("startRunoffConfirm")}
              disabled={pending}
              onConfirm={onStartRunoff}
              variant="default"
            >
              {t("startRunoff")}
            </ConfirmAction>
          )}
        </div>
      ) : null}
    </div>
  );
};

export const Elections = () => {
  const t = useTranslations("diwan.admin.governance.elections");
  const { supabase } = useAuth();
  const elections = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("elections")
          .select("*")
          .order("voting_opens_at", { ascending: false })
      ) ?? [],
    queryKey: key,
  });

  return (
    <div className="grid gap-6">
      {elections.isPending ? <SectionSpinner /> : null}
      {elections.data?.map((election) => (
        <ElectionCard election={election} key={election.id} />
      ))}
      <div className="flex flex-wrap gap-3">
        <NewLink href="/council/elections/new">{t("new")}</NewLink>
        <ExportButton
          fileName="sal-council-student-life.csv"
          label={t("councilList")}
          name="student-life-council"
        />
      </div>
    </div>
  );
};

/** A new election, on its own page under Elections (decisions.md). */
export const NewElection = () => {
  const t = useTranslations("diwan.admin.governance.elections");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [form, setForm] = useState({
    nominations_close_at: null as string | null,
    nominations_open_at: null as string | null,
    title: { ar: "", en: "" },
    voting_closes_at: null as string | null,
    voting_opens_at: null as string | null,
  });
  const [problem, setProblem] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: async () => {
      const times = [
        form.nominations_open_at,
        form.nominations_close_at,
        form.voting_opens_at,
        form.voting_closes_at,
      ];
      const [
        no = Number.NaN,
        nc = Number.NaN,
        vo = Number.NaN,
        vc = Number.NaN,
      ] = times.map((v) => (v ? new Date(v).getTime() : Number.NaN));
      if (!(nc > no && vo >= nc && vc > vo)) {
        setProblem(t("dateError"));
        throw new Error("invalid");
      }
      setProblem(null);
      unwrap(
        await supabase
          .schema("governance")
          .from("elections")
          .insert({
            nominations_close_at: form.nominations_close_at ?? "",
            nominations_open_at: form.nominations_open_at ?? "",
            title_ar: form.title.ar,
            title_en: form.title.en,
            voting_closes_at: form.voting_closes_at ?? "",
            voting_opens_at: form.voting_opens_at ?? "",
          })
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key });
      router.push("/council/elections");
    },
  });
  return (
    <RecordPage
      back="/council/elections"
      backLabel={t("back")}
      title={t("new")}
    >
      <form
        className="grid max-w-3xl gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        <BilingualField
          label={t("titleField")}
          maxLength={200}
          onChange={(title) => setForm((f) => ({ ...f, title }))}
          required
          value={form.title}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <DateTimeField
            label={t("nominationsOpen")}
            onChange={(v) => setForm((f) => ({ ...f, nominations_open_at: v }))}
            required
            value={form.nominations_open_at}
          />
          <DateTimeField
            label={t("nominationsClose")}
            onChange={(v) =>
              setForm((f) => ({ ...f, nominations_close_at: v }))
            }
            required
            value={form.nominations_close_at}
          />
          <DateTimeField
            label={t("votingOpens")}
            onChange={(v) => setForm((f) => ({ ...f, voting_opens_at: v }))}
            required
            value={form.voting_opens_at}
          />
          <DateTimeField
            label={t("votingCloses")}
            onChange={(v) => setForm((f) => ({ ...f, voting_closes_at: v }))}
            required
            value={form.voting_closes_at}
          />
        </div>
        {problem ? (
          <p className="text-text text-sm" role="alert">
            {problem}
          </p>
        ) : null}
        <SaveButton pending={create.isPending} />
        {create.error && create.error.message !== "invalid" ? (
          <ErrorLine error={create.error} />
        ) : null}
      </form>
    </RecordPage>
  );
};
