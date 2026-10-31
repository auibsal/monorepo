"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { hasPermissionAnywhere } from "@repo/rbac";
import { journal, localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { useGrants } from "@/lib/nexus/queries";
import { DiwanSection, RowList } from "../../page";
import { EmptyLine, SectionSpinner } from "../../states";
import {
  BilingualField,
  ConfirmAction,
  ErrorLine,
  Field,
  SelectInput,
} from "../kit";

const key = ["admin", "journal", "prizes"];

/** Today in Baghdad, as YYYY-MM-DD. */
const baghdadToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(
    new Date()
  );

/**
 * The prizes' own names (the Mutanabbi Prize and the rest) are proposed; the
 * public pages show them only once this is on (owner to confirm).
 */
const PrizeNames = () => {
  const t = useTranslations("nexus.admin.prizes.names");
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const grants = useGrants();
  const nameKey = [...key, "names-public"];
  const shown = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("core")
          .from("settings")
          .select("value")
          .eq("key", "journal.prize_names_public")
          .maybeSingle()
      )?.value === true,
    queryKey: nameKey,
  });
  const toggle = useMutation({
    mutationFn: async (value: boolean) =>
      unwrap(
        await supabase
          .schema("core")
          .from("settings")
          .update({ updated_by: user?.id ?? null, value })
          .eq("key", "journal.prize_names_public")
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: nameKey }),
  });
  if (
    !(hasPermissionAnywhere(grants.data, "settings.manage") && shown.isSuccess)
  ) {
    return null;
  }
  return (
    <div className="grid gap-2">
      <p className="type-body">{shown.data ? t("shown") : t("hidden")}</p>
      <ConfirmAction
        confirmLabel={shown.data ? t("hide") : t("show")}
        description={shown.data ? t("hideAsk") : t("showAsk")}
        onConfirm={() => toggle.mutate(!shown.data)}
      >
        {shown.data ? t("hide") : t("show")}
      </ConfirmAction>
      <ErrorLine error={toggle.error} />
    </div>
  );
};

/**
 * The Qirtas Prizes in the Diwan (owner, Oct 29, 2026): a round's dates,
 * and for each of the six prizes its judges and its shortlist, with the
 * winners marked; once the prizes are awarded, the certificates are
 * drafted for the President and the Faculty Advisor to sign.
 */
export const Prizes = () => {
  const t = useTranslations("nexus.admin.prizes");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const rounds = useQuery({
    queryFn: () => journal.prizeRounds(supabase),
    queryKey: [...key, "rounds"],
  });
  const all = useQuery({
    queryFn: () => journal.prizes(supabase),
    queryKey: [...key, "all"],
  });
  const [chosen, setChosen] = useState<string | null>(null);
  const round =
    rounds.data?.find((r) => r.id === chosen) ?? rounds.data?.[0] ?? null;

  const prepare = useMutation({
    mutationFn: async (roundId: string) =>
      unwrap(
        await supabase
          .schema("journal")
          .rpc("prepare_prize_certificates", { round: roundId })
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  if (!(rounds.data && all.data)) {
    return <SectionSpinner />;
  }

  return (
    <div className="grid gap-10">
      <p className="type-caption">{t("lede")}</p>
      <PrizeNames />
      {rounds.data.length > 1 ? (
        <Field label={t("round")}>
          {(id) => (
            <SelectInput
              className="w-64"
              id={id}
              onChange={(e) => setChosen(e.target.value)}
              value={round?.id ?? ""}
            >
              {rounds.data.map((r) => (
                <option key={r.id} value={r.id}>
                  {localized(r, "title", locale)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
      ) : null}
      {round ? (
        <>
          <p className="type-body">
            {t("dates", {
              awarded: formatLongDate(round.awarded_on, locale),
              round: localized(round, "title", locale),
              shortlist: formatLongDate(round.shortlist_on, locale),
            })}
          </p>
          {all.data.map((prize) => (
            <PrizeSection key={prize.key} prize={prize} roundId={round.id} />
          ))}
          <div className="grid gap-2">
            <ConfirmAction
              confirmLabel={t("prepare")}
              description={t("prepareHint")}
              disabled={baghdadToday() < round.awarded_on || prepare.isPending}
              onConfirm={() => prepare.mutate(round.id)}
              variant="default"
            >
              {t("prepare")}
            </ConfirmAction>
            {prepare.data === undefined ? null : (
              <p className="type-caption" role="status">
                {t("prepared", { count: String(prepare.data) })}
              </p>
            )}
            <ErrorLine error={prepare.error} />
          </div>
        </>
      ) : null}
      <NewRound />
    </div>
  );
};

type Prize = Awaited<ReturnType<typeof journal.prizes>>[number];

const PrizeSection = ({
  prize,
  roundId,
}: {
  prize: Prize;
  roundId: string;
}) => {
  const t = useTranslations("nexus.admin.prizes");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const entries = useQuery({
    queryFn: () => journal.prizeEntries(supabase, roundId),
    queryKey: [...key, "entries", roundId],
  });
  const judges = useQuery({
    queryFn: () => journal.prizeJudges(supabase, roundId),
    queryKey: [...key, "judges", roundId],
  });
  // Published pieces from the prize's section (any section for the
  // Mutanabbi Prize), the latest first.
  const candidates = useQuery({
    queryFn: async () => {
      let query = supabase
        .schema("journal")
        .from("pieces")
        .select("id, title_en, title_ar, desk")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(100);
      if (prize.desk) {
        query = query.eq("desk", prize.desk);
      }
      return unwrap(await query) ?? [];
    },
    queryKey: [...key, "candidates", prize.desk ?? "all"],
  });
  const [piece, setPiece] = useState("");
  const [judge, setJudge] = useState({ ar: "", en: "" });
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  const shortlist = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("journal").from("prize_entries").insert({
          piece_id: piece,
          prize_key: prize.key,
          round_id: roundId,
        })
      ),
    onSuccess: async () => {
      setPiece("");
      await refresh();
    },
  });
  const mark = useMutation({
    mutationFn: async ({ id, won }: { id: string; won: boolean }) =>
      unwrap(
        await supabase
          .schema("journal")
          .from("prize_entries")
          .update({ won })
          .eq("id", id)
      ),
    onSuccess: refresh,
  });
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
  const addJudge = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("journal").from("prize_judges").insert({
          name_ar: judge.ar,
          name_en: judge.en,
          prize_key: prize.key,
          round_id: roundId,
        })
      ),
    onSuccess: async () => {
      setJudge({ ar: "", en: "" });
      await refresh();
    },
  });
  const removeJudge = useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await supabase
          .schema("journal")
          .from("prize_judges")
          .delete()
          .eq("id", id)
      ),
    onSuccess: refresh,
  });

  const mine = (entries.data ?? []).filter((e) => e.prize_key === prize.key);
  const theirJudges = (judges.data ?? []).filter(
    (j) => j.prize_key === prize.key
  );

  const onShortlist = (event: FormEvent) => {
    event.preventDefault();
    if (piece) {
      shortlist.mutate();
    }
  };
  const onJudge = (event: FormEvent) => {
    event.preventDefault();
    addJudge.mutate();
  };

  return (
    <DiwanSection
      id={`prize-${prize.key}`}
      title={localized(prize, "name", locale)}
    >
      <div className="grid gap-3">
        <h3 className="type-label">{t("shortlist")}</h3>
        {mine.length === 0 ? (
          <EmptyLine>{t("noShortlist")}</EmptyLine>
        ) : (
          <RowList>
            {mine.map((entry) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3"
                key={entry.id}
              >
                <span className="type-body">
                  {entry.piece ? localized(entry.piece, "title", locale) : ""}
                  {entry.won ? ` · ${t("winner")}` : ""}
                </span>
                <span className="flex gap-2">
                  <Button
                    disabled={mark.isPending}
                    onClick={() =>
                      mark.mutate({ id: entry.id, won: !entry.won })
                    }
                    size="sm"
                    variant="ghost"
                  >
                    {entry.won ? t("notWinner") : t("markWinner")}
                  </Button>
                  <Button
                    disabled={drop.isPending}
                    onClick={() => drop.mutate(entry.id)}
                    size="sm"
                    variant="ghost"
                  >
                    {t("remove")}
                  </Button>
                </span>
              </li>
            ))}
          </RowList>
        )}
        <form className="flex flex-wrap items-end gap-3" onSubmit={onShortlist}>
          <Field className="min-w-64 flex-1" label={t("addPiece")}>
            {(fieldId) => (
              <SelectInput
                id={fieldId}
                onChange={(e) => setPiece(e.target.value)}
                value={piece}
              >
                <option value="">{t("choosePiece")}</option>
                {(candidates.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {localized(p, "title", locale)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <Button
            disabled={!piece || shortlist.isPending}
            size="sm"
            type="submit"
            variant="outline"
          >
            {t("shortlistIt")}
          </Button>
        </form>
        <ErrorLine error={shortlist.error ?? mark.error ?? drop.error} />
      </div>
      <div className="grid gap-3">
        <h3 className="type-label">{t("judges")}</h3>
        {theirJudges.length === 0 ? (
          <EmptyLine>{t("noJudges")}</EmptyLine>
        ) : (
          <RowList>
            {theirJudges.map((j) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3"
                key={j.id}
              >
                <span className="type-body">
                  {localized(j, "name", locale)}
                </span>
                <Button
                  disabled={removeJudge.isPending}
                  onClick={() => removeJudge.mutate(j.id)}
                  size="sm"
                  variant="ghost"
                >
                  {t("remove")}
                </Button>
              </li>
            ))}
          </RowList>
        )}
        <form className="grid gap-3" onSubmit={onJudge}>
          <BilingualField
            label={t("judgeName")}
            maxLength={200}
            onChange={setJudge}
            required
            value={judge}
          />
          <Button
            className="justify-self-start"
            disabled={addJudge.isPending}
            size="sm"
            type="submit"
            variant="outline"
          >
            {t("addJudge")}
          </Button>
        </form>
        <ErrorLine error={addJudge.error ?? removeJudge.error} />
      </div>
    </DiwanSection>
  );
};

/** A new round: its name and its two days. */
const NewRound = () => {
  const t = useTranslations("nexus.admin.prizes");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    awarded_on: "",
    shortlist_on: "",
    slug: "",
    title: { ar: "", en: "" },
  });
  const create = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("journal").from("prize_rounds").insert({
          awarded_on: form.awarded_on,
          is_published: true,
          shortlist_on: form.shortlist_on,
          slug: form.slug,
          title_ar: form.title.ar,
          title_en: form.title.en,
        })
      ),
    onSuccess: async () => {
      setForm({
        awarded_on: "",
        shortlist_on: "",
        slug: "",
        title: { ar: "", en: "" },
      });
      await queryClient.invalidateQueries({ queryKey: key });
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate();
  };
  return (
    <DiwanSection id="new-round" title={t("newRound")}>
      <form className="grid max-w-3xl gap-4" onSubmit={submit}>
        <BilingualField
          label={t("roundTitle")}
          maxLength={200}
          onChange={(title) => setForm((f) => ({ ...f, title }))}
          required
          value={form.title}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("slug")}>
            {(id) => (
              <Input
                dir="ltr"
                id={id}
                maxLength={40}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
                placeholder="2028"
                required
                value={form.slug}
              />
            )}
          </Field>
          <Field label={t("shortlistOn")}>
            {(id) => (
              <Input
                dir="ltr"
                id={id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, shortlist_on: e.target.value }))
                }
                required
                type="date"
                value={form.shortlist_on}
              />
            )}
          </Field>
          <Field label={t("awardedOn")}>
            {(id) => (
              <Input
                dir="ltr"
                id={id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, awarded_on: e.target.value }))
                }
                required
                type="date"
                value={form.awarded_on}
              />
            )}
          </Field>
        </div>
        <Button
          className="justify-self-start"
          disabled={create.isPending}
          type="submit"
          variant="outline"
        >
          {t("addRound")}
        </Button>
        <ErrorLine error={create.error} />
      </form>
    </DiwanSection>
  );
};
