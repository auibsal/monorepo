"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import type { Locale } from "@repo/internationalization";
import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { DateInput } from "@/components/fields/date-input";
import { useAuth } from "@/lib/auth/provider";
import { journal, localized, unwrap } from "@/lib/data";
import { EmptyLine, SectionSpinner } from "../../states";
import {
  AddInPlace,
  AdminHeading,
  ConfirmAction,
  DataTable,
  DateTimeField,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";

const key = ["admin", "journal", "prize"];

type Round = Awaited<ReturnType<typeof journal.prizeRounds>>[number];
type Entry = Awaited<ReturnType<typeof journal.prizeEntries>>[number];
type Category = journal.PrizeCategory;

/**
 * The Mutanabbi Prize in the Diwan (decisions.md): each year's
 * round, its two shortlists (Qirtas and Qalam), the outside judge's score
 * for each work, the members' vote dates, the count (70% judge, 30%
 * members), checked by the Editor-in-Chief and the Secretary, and
 * publishing the results for the award day.
 */
export const PrizeAdmin = () => {
  const t = useTranslations("diwan.admin.prize");
  const { supabase } = useAuth();
  const rounds = useQuery({
    queryFn: () => journal.prizeRounds(supabase),
    queryKey: [...key, "rounds"],
  });
  const [chosen, setChosen] = useState<string | null>(null);
  if (!rounds.data) {
    return <SectionSpinner />;
  }
  const round =
    rounds.data.find((r) => r.id === chosen) ?? rounds.data[0] ?? null;
  return (
    <div className="grid gap-10">
      <AdminHeading title={t("title")}>{t("lede")}</AdminHeading>
      {rounds.data.length > 1 ? (
        <Field label={t("round")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) => setChosen(e.target.value)}
              value={round?.id ?? ""}
            >
              {rounds.data.map((r) => (
                <option key={r.id} value={r.id}>
                  {String(r.year)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
      ) : null}
      {round ? (
        <RoundView round={round} />
      ) : (
        <EmptyLine>{t("noRounds")}</EmptyLine>
      )}
      <AddInPlace label={t("addRound")}>
        {(close) => <NewRound onDone={close} />}
      </AddInPlace>
    </div>
  );
};

/** A round runs to March 31 of its year, given at the Annual Meeting. */
const NewRound = ({ onDone }: { onDone: () => void }) => {
  const t = useTranslations("diwan.admin.prize");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [year, setYear] = useState(String(new Date().getFullYear() + 1));
  const add = useMutation({
    mutationFn: async () => {
      const y = Number(year);
      return unwrap(
        await supabase
          .schema("journal")
          .from("prize_rounds")
          .insert({
            period_from: `${y - 1}-04-01`,
            period_to: `${y}-03-31`,
            year: y,
          })
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key });
      onDone();
    },
  });
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    add.mutate();
  };
  return (
    <form className="grid max-w-sm gap-4" onSubmit={onSubmit}>
      <Field hint={t("yearHint")} label={t("year")}>
        {(id) => (
          <Input
            id={id}
            inputMode="numeric"
            min={2028}
            onChange={(e) => setYear(e.target.value)}
            required
            type="number"
            value={year}
          />
        )}
      </Field>
      <SaveButton pending={add.isPending} />
      <ErrorLine error={add.error} />
    </form>
  );
};

const RoundView = ({ round }: { round: Round }) => {
  const t = useTranslations("diwan.admin.prize");
  const locale = useLocale() as Locale;
  const voteOpen =
    round.vote_opens_at !== null && new Date(round.vote_opens_at) <= new Date();
  return (
    <div className="grid gap-10">
      <p className="type-body">
        {t("period", {
          from: formatLongDate(round.period_from, locale),
          to: formatLongDate(round.period_to, locale),
        })}
      </p>
      <RoundDates round={round} />
      {journal.PRIZE_CATEGORIES.map((category) => (
        <Shortlist
          category={category}
          key={category}
          locked={voteOpen}
          round={round}
        />
      ))}
      <Count round={round} />
    </div>
  );
};

const RoundDates = ({ round }: { round: Round }) => {
  const t = useTranslations("diwan.admin.prize");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [opens, setOpens] = useState(round.vote_opens_at);
  const [closes, setCloses] = useState(round.vote_closes_at);
  const [awarded, setAwarded] = useState(round.awarded_on ?? "");
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("prize_rounds")
          .update({
            awarded_on: awarded || null,
            vote_closes_at: closes,
            vote_opens_at: opens,
          })
          .eq("id", round.id)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };
  return (
    <form className="grid max-w-3xl gap-4" onSubmit={onSubmit}>
      <h2 className="type-heading">{t("dates")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <DateTimeField
          label={t("voteOpens")}
          onChange={setOpens}
          value={opens}
        />
        <DateTimeField
          label={t("voteCloses")}
          onChange={setCloses}
          value={closes}
        />
      </div>
      <Field hint={t("awardedHint")} label={t("awardedOn")}>
        {(id) => (
          <DateInput
            className="max-w-xs"
            id={id}
            onChange={(e) => setAwarded(e.target.value)}
            type="date"
            value={awarded}
          />
        )}
      </Field>
      <SaveButton pending={save.isPending} quiet success={save.isSuccess} />
      <ErrorLine error={save.error} />
    </form>
  );
};

const Shortlist = ({
  category,
  locked,
  round,
}: {
  category: Category;
  locked: boolean;
  round: Round;
}) => {
  const t = useTranslations("diwan.admin.prize");
  const locale = useLocale() as Locale;
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const entries = useQuery({
    queryFn: () => journal.prizeEntries(supabase, round.id),
    queryKey: [...key, "entries", round.id],
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const drop = useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await supabase
          .schema("journal")
          .from("prize_entries")
          .delete()
          .eq("id", id)
      ),
    onSuccess: refresh,
  });
  // A winner chooses whether to be named (decisions §5).
  const setNamed = useMutation({
    mutationFn: async ({ id, named }: { id: string; named: boolean }) =>
      unwrap(
        await supabase
          .schema("journal")
          .from("prize_entries")
          .update({ winner_named: named })
          .eq("id", id)
      ),
    onSuccess: refresh,
  });
  // Anyone connected to a work steps aside from it: no score, no vote.
  const recuse = useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await supabase
          .schema("journal")
          .from("prize_recusals")
          .insert({ entry_id: id })
      ),
    onSuccess: refresh,
  });
  const mine = (entries.data ?? []).filter((e) => e.category === category);
  const titleOf = (entry: Entry) =>
    entry.piece
      ? localized(entry.piece, "title", locale)
      : (entry.qalam_title ?? "");
  return (
    <section className="grid gap-4">
      <h2 className="type-heading">{t(`categories.${category}`)}</h2>
      <p className="type-caption">{t(`categoryHint.${category}`)}</p>
      <DataTable
        columns={[
          {
            cell: (entry) => (
              <span className="grid gap-0.5">
                <span>{titleOf(entry)}</span>
                {entry.qalam_byline ? (
                  <span className="type-caption">{entry.qalam_byline}</span>
                ) : null}
              </span>
            ),
            header: t("work"),
            key: "work",
          },
          {
            cell: (entry) => <JudgeScore entry={entry} />,
            header: t("judgeScore"),
            key: "score",
          },
          {
            cell: (entry) =>
              entry.category === "qirtas" ? (
                <span className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={entry.winner_named}
                    id={`named-${entry.id}`}
                    onCheckedChange={(v) =>
                      setNamed.mutate({ id: entry.id, named: v === true })
                    }
                  />
                  <Label htmlFor={`named-${entry.id}`}>
                    {t("winnerNamed")}
                  </Label>
                </span>
              ) : null,
            header: t("naming"),
            key: "named",
          },
          {
            cell: (entry) =>
              entry.recusals.some((r) => r.user_id === user?.id) ? (
                <span className="type-caption">{t("recused")}</span>
              ) : (
                <ConfirmAction
                  confirmLabel={t("recuse")}
                  description={t("recuseHint")}
                  onConfirm={() => recuse.mutate(entry.id)}
                  variant="ghost"
                >
                  {t("recuse")}
                </ConfirmAction>
              ),
            header: t("recusals"),
            key: "recuse",
          },
          {
            cell: (entry) =>
              locked ? null : (
                <ConfirmAction
                  confirmLabel={t("remove")}
                  description={t("removeHint")}
                  onConfirm={() => drop.mutate(entry.id)}
                  variant="ghost"
                >
                  {t("remove")}
                </ConfirmAction>
              ),
            header: "",
            key: "remove",
          },
        ]}
        empty={t("emptyShortlist")}
        rowKey={(entry) => entry.id}
        rows={mine}
      />
      <ErrorLine error={drop.error ?? setNamed.error ?? recuse.error} />
      {locked ? (
        <p className="type-caption">{t("shortlistClosed")}</p>
      ) : (
        <AddInPlace label={t("shortlistAdd")}>
          {(close) =>
            category === "qirtas" ? (
              <AddPiece onDone={close} round={round} />
            ) : (
              <AddQalamWork onDone={close} round={round} />
            )
          }
        </AddInPlace>
      )}
    </section>
  );
};

/** The outside judge's score out of 100, from the score sheet. */
const JudgeScore = ({ entry }: { entry: Entry }) => {
  const t = useTranslations("diwan.admin.prize");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [score, setScore] = useState(
    entry.judge_score === null ? "" : String(entry.judge_score)
  );
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("prize_entries")
          .update({ judge_score: score === "" ? null : Number(score) })
          .eq("id", entry.id)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={onSubmit}>
      <Input
        aria-label={t("judgeScore")}
        className="w-24"
        inputMode="decimal"
        max={100}
        min={0}
        onChange={(e) => setScore(e.target.value)}
        step="0.01"
        type="number"
        value={score}
      />
      <Button
        disabled={save.isPending}
        size="sm"
        type="submit"
        variant="outline"
      >
        {save.isSuccess ? t("scoreSaved") : t("saveScore")}
      </Button>
      <ErrorLine error={save.error} />
    </form>
  );
};

/** Published pieces from the round's year; the database checks the writer. */
const AddPiece = ({ onDone, round }: { onDone: () => void; round: Round }) => {
  const t = useTranslations("diwan.admin.prize");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const pieces = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("pieces")
          .select("id, title_en, title_ar")
          .eq("status", "published")
          .gte("published_at", `${round.period_from}T00:00:00+03:00`)
          .lte("published_at", `${round.period_to}T23:59:59+03:00`)
          .order("published_at", { ascending: false })
          .limit(200)
      ) ?? [],
    queryKey: [...key, "pieces", round.id],
  });
  const [piece, setPiece] = useState("");
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("journal").from("prize_entries").insert({
          category: "qirtas",
          piece_id: piece,
          round_id: round.id,
        })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key });
      onDone();
    },
  });
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (piece) {
      add.mutate();
    }
  };
  if (!pieces.data) {
    return <SectionSpinner />;
  }
  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <Field hint={t("pieceHint")} label={t("piece")}>
        {(id) => (
          <SelectInput
            id={id}
            onChange={(e) => setPiece(e.target.value)}
            value={piece}
          >
            {pieces.data.map((p) => (
              <option key={p.id} value={p.id}>
                {localized(p, "title", locale)}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
      <SaveButton disabled={!piece} pending={add.isPending} />
      <ErrorLine error={add.error} />
    </form>
  );
};

/** A Qalam work: its title, and the student's first name, last initial and school. */
const AddQalamWork = ({
  onDone,
  round,
}: {
  onDone: () => void;
  round: Round;
}) => {
  const t = useTranslations("diwan.admin.prize");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [byline, setByline] = useState("");
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("prize_entries")
          .insert({
            category: "qalam",
            qalam_byline: byline.trim() || null,
            qalam_title: title.trim(),
            round_id: round.id,
          })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key });
      onDone();
    },
  });
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    add.mutate();
  };
  return (
    <form className="grid max-w-xl gap-4" onSubmit={onSubmit}>
      <Field label={t("qalamTitle")}>
        {(id) => (
          <Input
            id={id}
            maxLength={300}
            onChange={(e) => setTitle(e.target.value)}
            required
            value={title}
          />
        )}
      </Field>
      <Field hint={t("qalamBylineHint")} label={t("qalamByline")}>
        {(id) => (
          <Input
            id={id}
            maxLength={200}
            onChange={(e) => setByline(e.target.value)}
            value={byline}
          />
        )}
      </Field>
      <SaveButton pending={add.isPending} />
      <ErrorLine error={add.error} />
    </form>
  );
};

/**
 * The count, once the vote closes: each work's judge score, votes, member
 * score and final score. The Editor-in-Chief and the Secretary
 * each check it; then the results can be published for the award day.
 */
const Count = ({ round }: { round: Round }) => {
  const t = useTranslations("diwan.admin.prize");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const closed =
    round.vote_closes_at !== null &&
    new Date(round.vote_closes_at) < new Date();
  const results = useQuery({
    enabled: closed,
    queryFn: () => journal.prizeResults(supabase, round.id),
    queryKey: [...key, "results", round.id],
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const check = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .rpc("check_prize_count", { round_id: round.id })
      ),
    onSuccess: refresh,
  });
  const publish = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("prize_rounds")
          .update({ results_published: true })
          .eq("id", round.id)
      ),
    onSuccess: refresh,
  });
  const checked = Boolean(
    round.count_checked_by_eic && round.count_checked_by_gs
  );
  return (
    <section className="grid gap-4">
      <h2 className="type-heading">{t("count")}</h2>
      {closed ? null : <p className="type-body">{t("countWaits")}</p>}
      {closed && results.data ? (
        <DataTable
          columns={[
            {
              cell: (r) => t(`categories.${r.category as Category}`),
              header: t("category"),
              key: "category",
            },
            {
              cell: (r) => formatNumber(r.rank),
              header: t("rank"),
              key: "rank",
            },
            {
              cell: (r) => localized(r, "title", locale),
              header: t("work"),
              key: "work",
            },
            {
              cell: (r) =>
                r.judge_score === null
                  ? ""
                  : formatNumber(Number(r.judge_score)),
              header: t("judgeScore"),
              key: "judge",
            },
            {
              cell: (r) => formatNumber(r.votes),
              header: t("votes"),
              key: "votes",
            },
            {
              cell: (r) => formatNumber(Number(r.final_score)),
              header: t("finalScore"),
              key: "final",
            },
          ]}
          rowKey={(r) => r.entry_id}
          rows={results.data}
        />
      ) : null}
      <ErrorLine error={results.error} />
      <ul className="grid gap-1">
        <li className="type-body">
          {round.count_checked_by_eic ? t("checkedEic") : t("uncheckedEic")}
        </li>
        <li className="type-body">
          {round.count_checked_by_gs ? t("checkedGs") : t("uncheckedGs")}
        </li>
      </ul>
      {round.results_published ? (
        <p className="type-body">{t("published")}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Button
            disabled={!closed || check.isPending}
            onClick={() => check.mutate()}
            size="sm"
            variant="outline"
          >
            {t("checkCount")}
          </Button>
          <ConfirmAction
            confirmLabel={t("publish")}
            description={t("publishHint")}
            disabled={!(checked && round.awarded_on) || publish.isPending}
            onConfirm={() => publish.mutate()}
            variant="default"
          >
            {t("publish")}
          </ConfirmAction>
        </div>
      )}
      <ErrorLine error={check.error ?? publish.error} />
    </section>
  );
};
