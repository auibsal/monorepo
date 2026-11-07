"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import {
  formatClock,
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { localized, membership, programmes, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ManageLinks } from "@/components/manage-links";
import { queryKeys, useMyShifts } from "@/lib/diwan/queries";
import { ErrorLine } from "../admin/kit";
import { StartLinks } from "../forms/forms";
import { DiwanPage, RowList } from "../page";
import { EmptyLine, ErrorState, SectionSpinner } from "../states";

type NoticeKey = "signedUp" | "gaveBack" | "full" | "notVerified" | "failed";

/**
 * Get involved (owner, Nov 7, 2026: open roles only): team roles, event
 * teams, Qalam mentors and auditions, then the volunteer shifts on coming
 * events, with what matches the member's skills first. Shifts live only on
 * an event and log no hours.
 *
 * Members sign up through programmes.sign_up_for_shift (it locks the shift,
 * so it can't overfill) and give a shift back by canceling their own
 * sign-up (RLS).
 */
const useShifts = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => {
      const now = new Date().toISOString();
      const [shifts, places] = await Promise.all([
        supabase
          .schema("programmes")
          .from("shifts")
          .select(
            "id, event_id, role_en, role_ar, location_en, location_ar, starts_at, ends_at, capacity, skills"
          )
          .gte("ends_at", now)
          .order("starts_at"),
        supabase.schema("programmes").rpc("shift_places"),
      ]);
      const rows = unwrap(shifts) ?? [];
      const events = rows.length
        ? (unwrap(
            await supabase
              .schema("events")
              .from("events")
              .select("id, slug, title_en, title_ar")
              .in("id", [...new Set(rows.map((r) => r.event_id))])
          ) ?? [])
        : [];
      const taken = new Map(
        (unwrap(places) ?? []).map((row) => [row.shift_id, row.taken])
      );
      const byId = new Map(events.map((e) => [e.id, e]));
      return rows.map((shift) => ({
        ...shift,
        event: byId.get(shift.event_id) ?? null,
        taken: taken.get(shift.id) ?? 0,
      }));
    },
    queryKey: ["shifts"],
  });
};

const errorKey = (error: unknown): NoticeKey => {
  const code = (error as { code?: string } | null)?.code;
  if (code === "42501") {
    return "notVerified";
  }
  if (code === "23514") {
    return "full";
  }
  return "failed";
};

export const PlacesBoard = () => {
  const t = useTranslations("diwan.programs");
  const tc = useTranslations("diwan.places");
  const locale = useLocale() as "en" | "ar";
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const rotas = useShifts();
  const mySkills = useMySkills();
  const mine = useMyShifts();
  const openings = useOpenings();
  const auditions = useUpcomingAuditions();
  const [notice, setNotice] = useState<{ id: string; key: NoticeKey } | null>(
    null
  );

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["shifts"] }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.shifts(user?.id ?? ""),
      }),
    ]);

  const signUp = useMutation({
    mutationFn: async (shiftId: string) =>
      unwrap(
        await supabase
          .schema("programmes")
          .rpc("sign_up_for_shift", { shift_id: shiftId })
      ),
    onError: (error, id) => setNotice({ id, key: errorKey(error) }),
    onSuccess: async (_result, id) => {
      setNotice({ id, key: "signedUp" });
      await refresh();
    },
  });

  const giveBack = useMutation({
    mutationFn: async (shiftId: string) =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("shift_signups")
          .update({ status: "cancelled" })
          .eq("shift_id", shiftId)
          .eq("user_id", user?.id ?? "")
      ),
    onError: (_error, id) => setNotice({ id, key: "failed" }),
    onSuccess: async (_result, id) => {
      setNotice({ id, key: "gaveBack" });
      await refresh();
    },
  });

  const held = new Set((mine.data ?? []).map((signup) => signup.shift_id));
  const busy = signUp.isPending || giveBack.isPending;

  if (rotas.isPending) {
    return <SectionSpinner />;
  }
  if (rotas.isError) {
    return <ErrorState onRetry={() => rotas.refetch()} />;
  }

  const skills = mySkills.data ?? [];
  const shifts = programmes.matchedFirst([...rotas.data], skills);

  const nothing =
    openings.isSuccess &&
    auditions.isSuccess &&
    openings.data.length === 0 &&
    shifts.length === 0 &&
    auditions.data.length === 0;

  return (
    <DiwanPage
      actions={<ManageLinks diwan="/membership/openings" />}
      lede={tc("lede")}
      title={tc("title")}
    >
      <p className="type-body max-w-3xl text-text-secondary">
        {skills.length > 0 ? tc("matched") : tc("noSkills")}{" "}
        <Link className="link" href="/account/settings/profile#details">
          {skills.length > 0 ? tc("editSkills") : tc("addSkills")}
        </Link>
      </p>

      {/* One list of everything open (owner, Oct 31, 2026: no sections):
          roles and places, shifts and auditions, each saying what it is. */}
      {openings.isPending || auditions.isPending ? <SectionSpinner /> : null}
      {nothing ? (
        <EmptyLine action={{ href: "/events", label: tc("whatsOn") }}>
          {tc("noRoles")}
        </EmptyLine>
      ) : (
        <RowList>
          <OpeningRows rows={openings.data ?? []} skills={skills} />
          {shifts.map((shift) => (
            <ShiftRow
              busy={busy}
              isMine={held.has(shift.id)}
              key={shift.id}
              matches={programmes.matchingSkills(shift.skills, skills)}
              notice={notice?.id === shift.id ? notice.key : null}
              onGiveBack={() => giveBack.mutate(shift.id)}
              onSignUp={() => signUp.mutate(shift.id)}
              rota={[
                tc("kinds.shift"),
                shift.event ? localized(shift.event, "title", locale) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              shift={shift}
            />
          ))}
          <AuditionRows rows={auditions.data ?? []} />
        </RowList>
      )}

      <div className="grid gap-2">
        <p className="type-caption">{t("ideas.lede")}</p>
        <StartLinks keys={["f11"]} />
      </div>
    </DiwanPage>
  );
};

type Shift = NonNullable<ReturnType<typeof useShifts>["data"]>[number];

interface ShiftRowProps {
  readonly busy: boolean;
  readonly isMine: boolean;
  readonly matches: readonly string[];
  readonly notice: NoticeKey | null;
  readonly onGiveBack: () => void;
  readonly onSignUp: () => void;
  readonly rota: string;
  readonly shift: Shift;
}

const ShiftRow = ({
  busy,
  isMine,
  matches,
  rota,
  notice,
  onGiveBack,
  onSignUp,
  shift,
}: ShiftRowProps) => {
  const t = useTranslations("diwan.programs");
  const locale = useLocale() as "en" | "ar";
  const left = Math.max(shift.capacity - shift.taken, 0);
  const location = localized(shift, "location", locale);

  return (
    <li className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="grid gap-1">
        <p className="type-subheading">{localized(shift, "role", locale)}</p>
        <p className="type-caption">{rota}</p>
        <Matches skills={matches} />
        <p className="type-body">
          {formatLongDate(shift.starts_at, locale)} ·{" "}
          {formatClock(shift.starts_at, locale)}–
          {formatClock(shift.ends_at, locale)}
          {location ? ` · ${location}` : ""}
        </p>
        <p className="type-caption">
          {isMine
            ? t("yours")
            : t("left", { count: left, places: formatNumber(left) })}
        </p>
        {notice ? (
          <p
            className="type-body font-medium"
            role={
              ["signedUp", "gaveBack"].includes(notice) ? "status" : "alert"
            }
          >
            {t(`notice.${notice}`)}
          </p>
        ) : null}
      </div>
      {isMine ? (
        <Button
          className="justify-self-start"
          disabled={busy}
          onClick={onGiveBack}
          variant="ghost"
        >
          {t("giveBack")}
        </Button>
      ) : (
        <Button
          className="justify-self-start"
          disabled={busy || left === 0}
          onClick={onSignUp}
          variant="outline"
        >
          {left === 0 ? t("full") : t("signUp")}
        </Button>
      )}
    </li>
  );
};

/** The skills the member gave in Profile. */
const useMySkills = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (await membership.myDetails(supabase, user?.id ?? "")).skills,
    queryKey: ["my-skills", user?.id],
  });
};

/** "Matches your skills: Photography", when it does. */
const Matches = ({ skills }: { skills: readonly string[] }) => {
  const tc = useTranslations("diwan.places");
  const ts = useTranslations("diwan.details.skills");
  if (skills.length === 0) {
    return null;
  }
  return (
    <p className="type-caption text-accent">
      {tc("matches", {
        skills: skills
          .map((s) => ts(s as (typeof membership.skills)[number]))
          .join(", "),
      })}
    </p>
  );
};

/** The open roles, team places and mentor places. */
const useOpenings = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: () => programmes.openings(supabase),
    queryKey: ["openings"],
  });
};

type Opening = NonNullable<ReturnType<typeof useOpenings>["data"]>[number];

/** Roles and places: "I'm interested", and Membership follows up. */
const OpeningRows = ({
  rows: list,
  skills,
}: {
  rows: readonly Opening[];
  skills: readonly string[];
}) => {
  const tc = useTranslations("diwan.places");
  const ts = useTranslations("diwan.details.skills");
  const locale = useLocale() as "en" | "ar";
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const replies = useQuery({
    enabled: Boolean(user),
    queryFn: () => programmes.myOpeningReplies(supabase, user?.id ?? ""),
    queryKey: ["opening-replies", user?.id],
  });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["opening-replies"] });
  const reply = useMutation({
    mutationFn: (id: string) => programmes.replyToOpening(supabase, id),
    onSuccess: refresh,
  });
  const withdraw = useMutation({
    mutationFn: (id: string) =>
      programmes.withdrawReply(supabase, id, user?.id ?? ""),
    onSuccess: refresh,
  });
  const mine = new Map(
    (replies.data ?? []).map((r) => [r.opening_id, r.status])
  );
  const rows = programmes.matchedFirst([...list], skills);
  type Row = (typeof rows)[number];
  // What it offers and whose it is, on one line.
  const where = (row: Row) =>
    [
      tc(`kinds.${row.kind as "role"}`),
      row.kind === "role" ? tc(`owners.${row.owner as "qirtas"}`) : null,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <>
      {rows.map((row) => {
        const interested = mine.has(row.id);
        const body = localized(row, "body", locale);
        return (
          <li
            className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center"
            key={row.id}
          >
            <div className="grid gap-1">
              <p className="type-subheading">
                {localized(row, "title", locale)}
              </p>
              <p className="type-caption">{where(row)}</p>
              {row.kind === "role" ? null : (
                <p className="type-caption">
                  {tc(`kindLines.${row.kind as "event_team"}`)}
                </p>
              )}
              {body ? <p className="type-body">{body}</p> : null}
              {row.skills.length > 0 ? (
                <p className="type-caption">
                  {tc("wants", {
                    skills: row.skills
                      .map((s) => ts(s as (typeof membership.skills)[number]))
                      .join(", "),
                  })}
                </p>
              ) : null}
              <Matches skills={programmes.matchingSkills(row.skills, skills)} />
              {row.closes_at ? (
                <p className="type-caption">
                  {tc("closes", {
                    date: formatLongDate(row.closes_at, locale),
                  })}
                </p>
              ) : null}
              {interested ? (
                <p className="type-body font-medium" role="status">
                  {tc(`application.${mine.get(row.id) as "new"}`)}
                </p>
              ) : null}
            </div>
            {interested ? (
              <Button
                className="justify-self-start"
                disabled={withdraw.isPending}
                onClick={() => withdraw.mutate(row.id)}
                variant="ghost"
              >
                {tc("takeBack")}
              </Button>
            ) : (
              <Button
                className="justify-self-start"
                disabled={reply.isPending}
                onClick={() => reply.mutate(row.id)}
                variant="outline"
              >
                {tc("interested")}
              </Button>
            )}
          </li>
        );
      })}
      {reply.error || withdraw.error ? (
        <li>
          <ErrorLine error={reply.error ?? withdraw.error} />
        </li>
      ) : null}
    </>
  );
};

/** Coming auditions: signing up is on the Company's page. */
const useUpcomingAuditions = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("auditions")
          .select(
            "id, starts_at, location_en, location_ar, productions(title_en, title_ar)"
          )
          .gte("starts_at", new Date().toISOString())
          .order("starts_at")
          .limit(12)
      ) ?? [],
    queryKey: ["get-involved-auditions"],
  });
};

type Audition = NonNullable<
  ReturnType<typeof useUpcomingAuditions>["data"]
>[number];

const AuditionRows = ({ rows }: { rows: readonly Audition[] }) => {
  const tc = useTranslations("diwan.places");
  const locale = useLocale() as "en" | "ar";
  return (
    <>
      {rows.map((row) => {
        const location = localized(row, "location", locale);
        return (
          <li
            className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center"
            key={row.id}
          >
            <div className="grid gap-1">
              <p className="type-subheading">
                {row.productions
                  ? localized(row.productions, "title", locale)
                  : null}
              </p>
              <p className="type-caption">{tc("kinds.audition")}</p>
              <p className="type-body">
                {formatLongDate(row.starts_at, locale)} ·{" "}
                {formatClock(row.starts_at, locale)}
                {location ? ` · ${location}` : ""}
              </p>
            </div>
            <Link className="link justify-self-start" href="/company/auditions">
              {tc("auditionsLink")}
            </Link>
          </li>
        );
      })}
    </>
  );
};
