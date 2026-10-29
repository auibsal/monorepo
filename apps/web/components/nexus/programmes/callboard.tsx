"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
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
import { queryKeys, useMyShifts } from "@/lib/nexus/queries";
import { ErrorLine } from "../admin/kit";
import { StartLinks } from "../forms/forms";
import { DiwanPage, DiwanSection, RowList } from "../page";
import { EmptyLine, ErrorState, SectionSpinner } from "../states";

type NoticeKey = "signedUp" | "gaveBack" | "full" | "notVerified" | "failed";

/**
 * The Callboard (owner, 2026-10-25; "Get involved"): roles a program needs
 * filled, shifts on the rotas and auditions, on one board, with what
 * matches the member's skills first. The hours given count toward the
 * service record and certificates.
 *
 * Rotas with their upcoming shifts. Members sign up through
 * programmes.sign_up_for_shift (it locks the shift, so it can't overfill)
 * and give a shift back by canceling their own sign-up (RLS).
 */
const useRotas = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => {
      const now = new Date().toISOString();
      const [rotas, programmeNames, places] = await Promise.all([
        supabase
          .schema("programmes")
          .from("rotas")
          .select(
            "id, programme_id, title_en, title_ar, shifts(id, role_en, role_ar, location_en, location_ar, starts_at, ends_at, capacity, skills)"
          )
          .gte("shifts.ends_at", now)
          .order("starts_at", { ascending: true, referencedTable: "shifts" }),
        supabase
          .schema("core")
          .from("programmes")
          .select("id, name_en, name_ar"),
        supabase.schema("programmes").rpc("shift_places"),
      ]);
      const taken = new Map(
        (unwrap(places) ?? []).map((row) => [row.shift_id, row.taken])
      );
      const names = new Map(
        (unwrap(programmeNames) ?? []).map((row) => [row.id, row])
      );
      return (unwrap(rotas) ?? [])
        .map((rota) => ({
          ...rota,
          programme: names.get(rota.programme_id) ?? null,
          shifts: rota.shifts.map((shift) => ({
            ...shift,
            taken: taken.get(shift.id) ?? 0,
          })),
        }))
        .filter((rota) => rota.shifts.length > 0);
    },
    queryKey: ["rotas"],
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

export const Callboard = () => {
  const t = useTranslations("nexus.programs");
  const tc = useTranslations("nexus.callboard");
  const locale = useLocale() as "en" | "ar";
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const rotas = useRotas();
  const mySkills = useMySkills();
  const mine = useMyShifts();
  const [notice, setNotice] = useState<{ id: string; key: NoticeKey } | null>(
    null
  );

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["rotas"] }),
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
  const shifts = programmes.matchedFirst(
    rotas.data.flatMap((rota) =>
      rota.shifts.map((shift) => ({ ...shift, rota }))
    ),
    skills
  );

  return (
    <DiwanPage lede={tc("lede")} title={tc("title")}>
      <p className="type-body max-w-3xl text-text-secondary">
        {skills.length > 0 ? tc("matched") : tc("noSkills")}{" "}
        <Link className="link" href="/membership/profile#details">
          {skills.length > 0 ? tc("editSkills") : tc("addSkills")}
        </Link>
      </p>

      <Openings skills={skills} />

      <DiwanSection description={t("lede")} id="shifts" title={tc("shifts")}>
        {shifts.length === 0 ? (
          <EmptyLine action={{ href: "/events", label: tc("whatsOn") }}>
            {t("empty")}
          </EmptyLine>
        ) : (
          <RowList>
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
                  localized(shift.rota, "title", locale),
                  shift.rota.programme
                    ? localized(shift.rota.programme, "name", locale)
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                shift={shift}
              />
            ))}
          </RowList>
        )}
      </DiwanSection>

      <Auditions />

      <DiwanSection
        description={tc("hoursLede")}
        id="hours"
        title={tc("hours")}
      >
        <Link className="link justify-self-start" href="/membership/service">
          {tc("hoursLink")}
        </Link>
      </DiwanSection>

      <DiwanSection
        description={t("ideas.lede")}
        id="ideas"
        title={t("ideas.title")}
      >
        <StartLinks keys={["f10", "f11", "f29"]} />
      </DiwanSection>
    </DiwanPage>
  );
};

type Rota = NonNullable<ReturnType<typeof useRotas>["data"]>[number];

interface ShiftRowProps {
  readonly busy: boolean;
  readonly isMine: boolean;
  readonly matches: readonly string[];
  readonly notice: NoticeKey | null;
  readonly onGiveBack: () => void;
  readonly onSignUp: () => void;
  readonly rota: string;
  readonly shift: Rota["shifts"][number];
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
  const t = useTranslations("nexus.programs");
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
  const tc = useTranslations("nexus.callboard");
  const ts = useTranslations("nexus.details.skills");
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

/** Roles a program needs filled: "I'm interested", and the managers follow up. */
const Openings = ({ skills }: { skills: readonly string[] }) => {
  const tc = useTranslations("nexus.callboard");
  const ts = useTranslations("nexus.details.skills");
  const locale = useLocale() as "en" | "ar";
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const list = useQuery({
    queryFn: async () => {
      const [rows, names] = await Promise.all([
        programmes.openings(supabase),
        supabase
          .schema("core")
          .from("programmes")
          .select("id, name_en, name_ar"),
      ]);
      const byId = new Map((unwrap(names) ?? []).map((p) => [p.id, p]));
      return rows.map((row) => ({
        ...row,
        programme: row.programme_id
          ? (byId.get(row.programme_id) ?? null)
          : null,
      }));
    },
    queryKey: ["openings"],
  });
  const replies = useQuery({
    enabled: Boolean(user),
    queryFn: () => programmes.myOpeningReplies(supabase, user?.id ?? ""),
    queryKey: ["opening-replies", user?.id],
  });
  const placements = useQuery({
    enabled: Boolean(user),
    queryFn: () => programmes.myPlacements(supabase, user?.id ?? ""),
    queryKey: ["placements", user?.id],
  });
  const tj = useTranslations("nexus.admin.journal");
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
  const mine = new Set(replies.data ?? []);
  const rows = programmes.matchedFirst(list.data ?? [], skills);
  type Row = (typeof rows)[number];
  // What it offers, where, and for which term, on one line.
  const where = (row: Row) => {
    let place: string | null = null;
    if (row.desk) {
      place = `${tc("qirtas")} · ${tj(`desks.${row.desk}`)}`;
    } else if (row.programme) {
      place = localized(row.programme, "name", locale);
    }
    return [
      row.kind === "role" ? null : tc(`kinds.${row.kind as "apprenticeship"}`),
      place,
      row.term_from && row.term_to
        ? tc("term", {
            from: formatLongDate(row.term_from, locale),
            to: formatLongDate(row.term_to, locale),
          })
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
  };

  return (
    <DiwanSection description={tc("rolesLede")} id="roles" title={tc("roles")}>
      {list.isPending ? <SectionSpinner /> : null}
      {list.data?.length === 0 ? (
        <p className="type-body text-text-secondary">{tc("noRoles")}</p>
      ) : null}
      <RowList>
        {rows.map((row) => {
          const interested = mine.has(row.id);
          const body = localized(row, "body", locale);
          const placed = placements.data?.find(
            (pl) => pl.opening_id === row.id && pl.status !== "withdrawn"
          );
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
                    {tc(`kindLines.${row.kind as "apprenticeship"}`)}
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
                <Matches
                  skills={programmes.matchingSkills(row.skills, skills)}
                />
                {row.closes_at ? (
                  <p className="type-caption">
                    {tc("closes", {
                      date: formatLongDate(row.closes_at, locale),
                    })}
                  </p>
                ) : null}
                {placed ? (
                  <p className="type-body font-medium" role="status">
                    {tc(`placed.${placed.status as "active"}`)}
                  </p>
                ) : null}
                {interested && !placed ? (
                  <p className="type-body font-medium" role="status">
                    {tc("interestedNote")}
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
      </RowList>
      <ErrorLine error={reply.error ?? withdraw.error} />
    </DiwanSection>
  );
};

/** Coming auditions, with the way to sign up on the Company's page. */
const Auditions = () => {
  const tc = useTranslations("nexus.callboard");
  const locale = useLocale() as "en" | "ar";
  const { supabase } = useAuth();
  const list = useQuery({
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
          .limit(10)
      ) ?? [],
    queryKey: ["callboard-auditions"],
  });
  return (
    <DiwanSection
      action={
        <Link className="link" href="/events/company/auditions">
          {tc("auditionsLink")}
        </Link>
      }
      description={tc("auditionsLede")}
      id="auditions"
      title={tc("auditions")}
    >
      {list.data?.length === 0 ? (
        <p className="type-body text-text-secondary">{tc("noAuditions")}</p>
      ) : null}
      <RowList>
        {list.data?.map((row) => {
          const location = localized(row, "location", locale);
          return (
            <li className="grid gap-1" key={row.id}>
              <p className="type-subheading">
                {row.productions
                  ? localized(row.productions, "title", locale)
                  : null}
              </p>
              <p className="type-body">
                {formatLongDate(row.starts_at, locale)} ·{" "}
                {formatClock(row.starts_at, locale)}
                {location ? ` · ${location}` : ""}
              </p>
            </li>
          );
        })}
      </RowList>
    </DiwanSection>
  );
};
