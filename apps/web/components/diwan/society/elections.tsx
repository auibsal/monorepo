"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Label } from "@repo/brand/components/ui/label";
import { Textarea } from "@repo/brand/components/ui/textarea";
import { localizedPath } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { Link, useRouter } from "@repo/internationalization/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { ChoiceInput } from "@/components/diwan/admin/choice-input";
import { isAuibEmail } from "@/lib/auth/email";
import { useAuth } from "@/lib/auth/provider";
import { governance, localized, unwrap } from "@/lib/data";
import { DiwanPage } from "../page";
import { EmptyLine, ErrorState, SectionSpinner } from "../states";
import { SocietySection } from "./section";

type Lang = "en" | "ar";

/**
 * Elections: stand during nominations, choose one candidate per seat (or
 * abstain) while voting is open, read the results once published. A seat
 * needs a majority of the votes cast; otherwise a runoff between the top
 * two follows within a week (decisions §4). RLS shows only announced elections, approved candidates (and
 * the member's own nomination); cast_ballot enforces eligibility and the
 * one-ballot rule, and keeps the ballot apart from the voter.
 */
const useElections = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => {
      const elections =
        unwrap(
          await supabase
            .schema("governance")
            .from("elections")
            .select(
              "id, title_en, title_ar, status, nominations_open_at, nominations_close_at, voting_opens_at, voting_closes_at, voting_point_en, voting_point_ar, voting_point_at, runoff_of, forum_event_id, positions!positions_election_id_fkey(id, title_en, title_ar, sort, candidates(id, user_id, status, statement_en, statement_ar))"
            )
            .neq("status", "draft")
            .order("voting_opens_at", { ascending: false })
            .limit(5)
        ) ?? [];
      const ids = elections.map((e) => e.id);
      const userIds = [
        ...new Set(
          elections.flatMap((e) =>
            e.positions.flatMap((p) => p.candidates.map((c) => c.user_id))
          )
        ),
      ];
      const [voters, receipts, results, people] = await Promise.all([
        supabase
          .schema("governance")
          .from("voters")
          .select("election_id")
          .in("election_id", ids),
        supabase
          .schema("governance")
          .from("ballot_receipts")
          .select("election_id")
          .in("election_id", ids),
        supabase
          .schema("governance")
          .from("election_results")
          .select(
            "election_id, position_id, winner_candidate_id, ron_won, runoff_candidate_ids, decided_by_lot"
          )
          .in("election_id", ids),
        userIds.length
          ? supabase
              .schema("core")
              .from("profiles")
              .select("id, full_name_en, full_name_ar")
              .in("id", userIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      return {
        elections: elections.map((e) => ({
          ...e,
          positions: [...e.positions].sort((a, b) => a.sort - b.sort),
        })),
        me: user?.id ?? "",
        names: new Map((unwrap(people) ?? []).map((p) => [p.id, p])),
        results: unwrap(results) ?? [],
        voted: new Set((unwrap(receipts) ?? []).map((r) => r.election_id)),
        voter: new Set((unwrap(voters) ?? []).map((v) => v.election_id)),
      };
    },
    queryKey: ["elections", user?.id ?? ""],
  });
};

type Data = NonNullable<ReturnType<typeof useElections>["data"]>;
type Election = Data["elections"][number];
type Position = Election["positions"][number];

const between = (from: string, to: string) => {
  const now = Date.now();
  return now >= Date.parse(from) && now <= Date.parse(to);
};

const errorKey = (error: unknown) => {
  const { code, message } = (error ?? {}) as {
    code?: string;
    message?: string;
  };
  if (code === "23514" && message?.includes("gpa_consent_required")) {
    return "gpaConsent";
  }
  if (code === "23505") {
    return "already";
  }
  if (code === "42501") {
    return "notEligible";
  }
  if (code === "22023") {
    return "closed";
  }
  return "failed";
};

/**
 * Standing for a position, on its own page (decisions.md: every new
 * record opens its own page): the statement in each language, then back
 * to Society, where the nomination shows as the member's own.
 */
const Nominate = ({ position }: { readonly position: Position }) => {
  const t = useTranslations("diwan.society.elections");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const nominate = useMutation({
    mutationFn: async ({
      ar,
      consent,
      en,
    }: {
      ar: string;
      consent: boolean;
      en: string;
    }) =>
      unwrap(
        await supabase.schema("governance").rpc("nominate", {
          gpa_consent: consent,
          position_id: position.id,
          statement_ar: ar || undefined,
          statement_en: en,
        })
      ),
    onError: (error) => setNotice(errorKey(error)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["elections"] });
      router.push("/account/elections");
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    nominate.mutate({
      ar: String(data.get("ar") ?? "").trim(),
      consent: data.get("gpa_consent") === "on",
      en: String(data.get("en") ?? "").trim(),
    });
  };

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-2">
        <Label htmlFor={`en-${position.id}`}>{t("statementEn")}</Label>
        <Textarea
          id={`en-${position.id}`}
          maxLength={4000}
          name="en"
          required
          rows={6}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`ar-${position.id}`}>{t("statementAr")}</Label>
        <Textarea
          dir="rtl"
          id={`ar-${position.id}`}
          lang="ar"
          maxLength={4000}
          name="ar"
          rows={6}
        />
      </div>
      {/* Owner, Nov 7, 2026: Student Life confirms a GPA of 2.0 or more,
          answering only "eligible" or "not eligible"; grades are never
          stored. */}
      <div className="flex items-start gap-2">
        <input
          className="accent-accent mt-1 size-4"
          id={`gpa-${position.id}`}
          name="gpa_consent"
          required
          type="checkbox"
        />
        <Label className="font-normal" htmlFor={`gpa-${position.id}`}>
          {t("gpaConsent")}
        </Label>
      </div>
      <Button
        className="justify-self-start"
        disabled={nominate.isPending}
        type="submit"
      >
        {t("submitNomination")}
      </Button>
      {notice ? (
        <p className="type-body font-medium" role="alert">
          {t(`notice.${notice as "nominated"}`)}
        </p>
      ) : null}
    </form>
  );
};

/** /account/elections/<position>: standing for one position. */
export const StandForOffice = ({
  positionId,
}: {
  readonly positionId: string;
}) => {
  const t = useTranslations("diwan.society.elections");
  const locale = useLocale() as Lang;
  const data = useElections();
  if (data.isPending) {
    return <SectionSpinner />;
  }
  if (data.isError) {
    return <ErrorState onRetry={() => data.refetch()} />;
  }
  const election = data.data.elections.find((e) =>
    e.positions.some((p) => p.id === positionId)
  );
  const position = election?.positions.find((p) => p.id === positionId);
  const mine = position?.candidates.some((c) => c.user_id === data.data.me);
  const open =
    election &&
    between(election.nominations_open_at, election.nominations_close_at);
  const back = (
    <Link className="link" href="/account/elections">
      {t("backToSociety")}
    </Link>
  );
  if (!(election && position && open) || mine) {
    return (
      <DiwanPage actions={back} narrow title={t("stand")}>
        <p className="type-body">{t(mine ? "alreadyStanding" : "notOpen")}</p>
      </DiwanPage>
    );
  }
  return (
    <DiwanPage
      actions={back}
      lede={localized(election, "title", locale)}
      narrow
      title={t("standFor", { position: localized(position, "title", locale) })}
    >
      <Nominate position={position} />
    </DiwanPage>
  );
};

const Ballot = ({
  data,
  election,
}: {
  readonly data: Data;
  readonly election: Election;
}) => {
  const t = useTranslations("diwan.society.elections");
  const locale = useLocale() as Lang;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const cast = useMutation({
    mutationFn: (ballot: governance.Ballot) =>
      governance.castBallot(supabase, election.id, ballot),
    onError: (error) => setNotice(errorKey(error)),
    onSuccess: () => {
      setNotice("voted");
      return queryClient.invalidateQueries({ queryKey: ["elections"] });
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ballot: governance.Ballot = {};
    for (const position of election.positions) {
      const choice = String(form.get(position.id) ?? "");
      ballot[position.id] = choice ? [choice] : [];
    }
    cast.mutate(ballot);
  };

  const name = (userId: string) => {
    const person = data.names.get(userId);
    return person ? localized(person, "full_name", locale) : "";
  };

  return (
    <form className="grid gap-6" onSubmit={submit}>
      <p className="type-body">{t("ballotHelp")}</p>
      {election.positions.map((position) => {
        const candidates = position.candidates.filter(
          (c) => c.status === "approved"
        );
        return (
          <div
            className="border-line pt-space-4 grid gap-3 border-t"
            key={position.id}
          >
            <Label htmlFor={`${election.id}-${position.id}`}>
              {localized(position, "title", locale)}
            </Label>
            <ChoiceInput
              defaultValue=""
              id={`${election.id}-${position.id}`}
              name={position.id}
            >
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {name(c.user_id)}
                </option>
              ))}
              {candidates.length <= 1 && !election.runoff_of ? (
                <option value={governance.RON}>{t("ron")}</option>
              ) : null}
              <option value="">{t("abstain")}</option>
            </ChoiceInput>
          </div>
        );
      })}
      <Button
        className="justify-self-start"
        disabled={cast.isPending}
        type="submit"
      >
        {t("cast")}
      </Button>
      {notice ? (
        <p
          className="type-body font-medium"
          role={notice === "voted" ? "status" : "alert"}
        >
          {t(`notice.${notice as "voted"}`)}
        </p>
      ) : null}
    </form>
  );
};

type Translate = ReturnType<typeof useTranslations<"diwan.society.elections">>;

/** Where members vote in person, if the Committee has said. */
const votingPointLine = (
  election: Election,
  locale: string,
  t: Translate,
  when: (iso: string) => string
) => {
  const place = localized(election, "voting_point", locale);
  if (!place) {
    return null;
  }
  return election.voting_point_at
    ? t("votingPointAt", { place, when: when(election.voting_point_at) })
    : t("votingPoint", { place });
};

/** A seat's published outcome: elected, reopened, a runoff, or the draw. */
const outcomeLine = (
  result: Data["results"][number] | undefined,
  winnerName: string | null,
  isRunoff: boolean,
  t: Translate
) => {
  if (result?.ron_won) {
    return t("ronWon");
  }
  if (winnerName) {
    return result?.decided_by_lot
      ? t("byLot", { name: winnerName })
      : winnerName;
  }
  if (result?.runoff_candidate_ids?.length) {
    return isRunoff ? t("tied") : t("runoff");
  }
  return t("pending");
};

const ElectionCard = ({
  data,
  election,
}: {
  readonly data: Data;
  readonly election: Election;
}) => {
  const t = useTranslations("diwan.society.elections");
  const locale = useLocale() as Lang;
  const { user } = useAuth();
  // B6.7: online ballots are for AUIB accounts; cast_ballot enforces it.
  const auib = isAuibEmail(user?.email ?? "");
  const nominating =
    election.status === "nominations" &&
    between(election.nominations_open_at, election.nominations_close_at);
  const voting =
    election.status === "voting" &&
    between(election.voting_opens_at, election.voting_closes_at);
  const name = (userId: string) => {
    const person = data.names.get(userId);
    return person ? localized(person, "full_name", locale) : "";
  };
  const canVote =
    voting && !data.voted.has(election.id) && data.voter.has(election.id);
  const when = (iso: string) =>
    `${formatLongDate(iso, locale)} · ${formatClock(iso, locale)}`;

  return (
    <article className="border-line pt-space-4 grid gap-4 border-t">
      <header className="grid gap-1">
        <h3 className="type-heading">{localized(election, "title", locale)}</h3>
        <p className="type-caption">
          {t(`status.${election.status as "voting"}`)}
        </p>
        <p className="type-caption">
          {t("dates", {
            nominations: when(election.nominations_close_at),
            voting: when(election.voting_closes_at),
          })}
        </p>
        <ElectionPlaces election={election} when={when} />
      </header>

      {voting && data.voted.has(election.id) ? (
        <p className="type-body font-medium">{t("youVoted")}</p>
      ) : null}
      {canVote && auib ? <Ballot data={data} election={election} /> : null}
      {canVote && !auib ? <p className="type-body">{t("auibOnly")}</p> : null}
      {voting && !data.voter.has(election.id) ? (
        <p className="type-body">{t("notEligible")}</p>
      ) : null}

      {election.status === "notice" ||
      election.status === "nominations" ||
      election.status === "review" ? (
        <p className="type-caption">
          {t(data.voter.has(election.id) ? "onList" : "notOnList")}
        </p>
      ) : null}

      {election.status !== "voting" && election.status !== "published"
        ? election.positions.map((position) => {
            const mine = position.candidates.find((c) => c.user_id === data.me);
            const approved = position.candidates.filter(
              (c) => c.status === "approved"
            );
            return (
              <section
                className="border-line grid gap-2 border-t pt-3"
                key={position.id}
              >
                <h4 className="type-subheading">
                  {localized(position, "title", locale)}
                </h4>
                {approved.length === 0 ? (
                  <p className="type-caption">{t("noCandidates")}</p>
                ) : (
                  <ul className="grid gap-2">
                    {approved.map((c) => (
                      <li key={c.id}>
                        <p className="font-medium">{name(c.user_id)}</p>
                        <p className="type-body text-text-secondary">
                          {localized(c, "statement", locale)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                {mine ? (
                  <p className="type-caption">
                    {t(`yourNomination.${mine.status as "nominated"}`)}
                  </p>
                ) : null}
                {nominating && !mine ? (
                  <Link
                    className="link justify-self-start font-medium"
                    href={`/account/elections/${position.id}`}
                  >
                    {t("stand")}
                  </Link>
                ) : null}
              </section>
            );
          })
        : null}

      {election.status === "published" ? (
        <ul className="grid gap-2">
          {election.positions.map((position) => {
            const result = data.results.find(
              (r) => r.position_id === position.id
            );
            const winner = position.candidates.find(
              (c) => c.id === result?.winner_candidate_id
            );
            const outcome = outcomeLine(
              result,
              winner ? name(winner.user_id) : null,
              Boolean(election.runoff_of),
              t
            );
            return (
              <li className="border-line border-b py-2" key={position.id}>
                <span className="type-caption">
                  {localized(position, "title", locale)}
                </span>
                <p className="type-subheading">{outcome}</p>
              </li>
            );
          })}
        </ul>
      ) : null}
    </article>
  );
};

export const Elections = () => {
  const t = useTranslations("diwan.society.elections");
  const ta = useTranslations("diwan.next");
  const locale = useLocale();
  const elections = useElections();

  return (
    <SocietySection id="elections" lede={t("lede")} title={t("title")}>
      {elections.isPending ? <SectionSpinner /> : null}
      {elections.isError ? (
        <ErrorState onRetry={() => elections.refetch()} />
      ) : null}
      {elections.data?.elections.length === 0 ? (
        <EmptyLine
          action={{
            href: `${localizedPath(locale, "/library/constitution")}`,
            label: ta("readConstitution"),
          }}
        >
          {t("empty")}
        </EmptyLine>
      ) : null}
      {elections.data?.elections.map((election) => (
        <ElectionCard
          data={elections.data}
          election={election}
          key={election.id}
        />
      ))}
    </SocietySection>
  );
};

/**
 * The candidates' forum, in the week before voting (decisions.md,
 * Governance); its event page carries the recording afterward.
 */
const ForumLine = ({
  eventId,
  when,
}: {
  readonly eventId: string;
  readonly when: (iso: string) => string;
}) => {
  const t = useTranslations("diwan.society.elections");
  const locale = useLocale() as Lang;
  const { supabase } = useAuth();
  const forum = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .from("events")
          .select("slug, title_en, title_ar, starts_at")
          .eq("id", eventId)
          .maybeSingle()
      ),
    queryKey: ["election-forum", eventId],
  });
  if (!forum.data) {
    return null;
  }
  return (
    <p className="type-caption">
      {t("forum", { when: when(forum.data.starts_at) })}{" "}
      <Link className="link" href={`/events/${forum.data.slug}`}>
        {localized(forum.data, "title", locale)}
      </Link>
    </p>
  );
};

/** Where members vote in person, and the candidates' forum, if set. */
const ElectionPlaces = ({
  election,
  when,
}: {
  readonly election: Election;
  readonly when: (iso: string) => string;
}) => {
  const t = useTranslations("diwan.society.elections");
  const locale = useLocale() as Lang;
  const votingPoint = votingPointLine(election, locale, t, when);
  return (
    <>
      {votingPoint ? <p className="type-caption">{votingPoint}</p> : null}
      {election.forum_event_id ? (
        <ForumLine eventId={election.forum_event_id} when={when} />
      ) : null}
    </>
  );
};
