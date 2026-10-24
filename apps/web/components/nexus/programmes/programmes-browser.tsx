"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import {
  formatClock,
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { queryKeys, useMyShifts } from "@/lib/nexus/queries";
import { StartLinks } from "../forms/forms";
import { DiwanPage, DiwanSection, RowList } from "../page";
import { EmptyLine, ErrorState, SectionSpinner } from "../states";

type NoticeKey = "signedUp" | "gaveBack" | "full" | "notVerified" | "failed";

/**
 * Rotas with their upcoming shifts. Members sign up through
 * programmes.sign_up_for_shift (it locks the shift, so it can't overfill)
 * and give a shift back by cancelling their own sign-up (RLS).
 */
const useRotas = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => {
      const now = new Date().toISOString();
      const [rotas, programmes, places] = await Promise.all([
        supabase
          .schema("programmes")
          .from("rotas")
          .select(
            "id, programme_id, title_en, title_ar, shifts(id, role_en, role_ar, location_en, location_ar, starts_at, ends_at, capacity)"
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
        (unwrap(programmes) ?? []).map((row) => [row.id, row])
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

export const ProgrammesBrowser = () => {
  const t = useTranslations("nexus.programs");
  const ta = useTranslations("nexus.next");
  const locale = useLocale() as "en" | "ar";
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const rotas = useRotas();
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

  return (
    <DiwanPage
      actions={
        <Link className="link" href="/programs/productions/auditions">
          {t("productionsLink")}
        </Link>
      }
      lede={t("lede")}
      title={t("title")}
    >
      {rotas.data.length === 0 ? (
        <EmptyLine action={{ href: "/events/book", label: ta("browseEvents") }}>
          {t("empty")}
        </EmptyLine>
      ) : null}

      {rotas.data.map((rota) => (
        <DiwanSection
          description={
            rota.programme
              ? localized(rota.programme, "name", locale)
              : undefined
          }
          id={`rota-${rota.id}`}
          key={rota.id}
          title={localized(rota, "title", locale)}
        >
          <RowList>
            {rota.shifts.map((shift) => (
              <ShiftRow
                busy={busy}
                isMine={held.has(shift.id)}
                key={shift.id}
                notice={notice?.id === shift.id ? notice.key : null}
                onGiveBack={() => giveBack.mutate(shift.id)}
                onSignUp={() => signUp.mutate(shift.id)}
                shift={shift}
              />
            ))}
          </RowList>
        </DiwanSection>
      ))}

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
  readonly notice: NoticeKey | null;
  readonly onGiveBack: () => void;
  readonly onSignUp: () => void;
  readonly shift: Rota["shifts"][number];
}

const ShiftRow = ({
  busy,
  isMine,
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
