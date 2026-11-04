"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { journal, localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { DateInput } from "@/components/fields/date-input";
import { useRouter } from "@/lib/nexus/navigation";
import { DiwanSection, RowList } from "../../page";
import { EmptyLine, SectionSpinner } from "../../states";
import {
  AdminHeading,
  BilingualField,
  ConfirmAction,
  ErrorLine,
  Field,
  NewLink,
  RecordPage,
  SelectInput,
} from "../kit";
import { MemberPicker, type Person } from "../member-picker";

const key = ["admin", "journal", "awards"];

/** Today in Baghdad, as YYYY-MM-DD. */
const baghdadToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(
    new Date()
  );

/**
 * The Qirtas Awards in the Diwan (owner, Oct 29, 2026): a round's dates,
 * and for each of the six awards its judges and its shortlist, with the
 * winners marked; once the awards are awarded, the certificates are
 * drafted for the President and the Faculty Advisor to sign.
 */
export const Awards = () => {
  const t = useTranslations("nexus.admin.awards");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const rounds = useQuery({
    queryFn: () => journal.awardRounds(supabase),
    queryKey: [...key, "rounds"],
  });
  const all = useQuery({
    queryFn: () => journal.awards(supabase),
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
          .rpc("prepare_award_certificates", { round: roundId })
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  if (!(rounds.data && all.data)) {
    return <SectionSpinner />;
  }

  return (
    <div className="grid gap-10">
      <AdminHeading title={t("title")}>{t("lede")}</AdminHeading>
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
          {all.data.map((award) => (
            <AwardSection award={award} key={award.key} roundId={round.id} />
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
      <NewLink href="/qirtas/awards/new">{t("newRound")}</NewLink>
    </div>
  );
};

type Award = Awaited<ReturnType<typeof journal.awards>>[number];

const AwardSection = ({
  award,
  roundId,
}: {
  award: Award;
  roundId: string;
}) => {
  const t = useTranslations("nexus.admin.awards");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const entries = useQuery({
    queryFn: () => journal.awardEntries(supabase, roundId),
    queryKey: [...key, "entries", roundId],
  });
  const judges = useQuery({
    queryFn: () => journal.awardJudges(supabase, roundId),
    queryKey: [...key, "judges", roundId],
  });
  // Published pieces from the award's section (any section for the
  // Mutanabbi Award), the latest first.
  const candidates = useQuery({
    queryFn: async () => {
      let query = supabase
        .schema("journal")
        .from("pieces")
        .select("id, title_en, title_ar, desk")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(100);
      if (award.desk) {
        query = query.eq("desk", award.desk);
      }
      return unwrap(await query) ?? [];
    },
    queryKey: [...key, "candidates", award.desk ?? "all"],
  });
  const [piece, setPiece] = useState("");
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  const shortlist = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("journal").from("award_entries").insert({
          award_key: award.key,
          piece_id: piece,
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
          .from("award_entries")
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
          .from("award_entries")
          .delete()
          .eq("id", id)
      ),
    onSuccess: refresh,
  });
  // A judge is chosen from the register; the database keeps their names
  // in step with their profile.
  const addJudge = useMutation({
    mutationFn: async (person: Person) =>
      unwrap(
        await supabase
          .schema("journal")
          .from("award_judges")
          .insert({
            award_key: award.key,
            name_ar: person.full_name_ar ?? person.full_name_en,
            name_en: person.full_name_en,
            round_id: roundId,
            user_id: person.id,
          })
      ),
    onSuccess: refresh,
  });
  const removeJudge = useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await supabase
          .schema("journal")
          .from("award_judges")
          .delete()
          .eq("id", id)
      ),
    onSuccess: refresh,
  });

  const mine = (entries.data ?? []).filter((e) => e.award_key === award.key);
  const theirJudges = (judges.data ?? []).filter(
    (j) => j.award_key === award.key
  );

  const onShortlist = (event: FormEvent) => {
    event.preventDefault();
    if (piece) {
      shortlist.mutate();
    }
  };

  return (
    <DiwanSection
      id={`award-${award.key}`}
      title={localized(award, "name", locale)}
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
        <MemberPicker
          label={t("addJudge")}
          onChange={(person) => {
            if (person) {
              addJudge.mutate(person);
            }
          }}
          value={null}
        />
        <ErrorLine error={addJudge.error ?? removeJudge.error} />
      </div>
    </DiwanSection>
  );
};

/** A new round: its name and its two days. */
export const NewRound = () => {
  const t = useTranslations("nexus.admin.awards");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [form, setForm] = useState({
    awarded_on: "",
    shortlist_on: "",
    slug: "",
    title: { ar: "", en: "" },
  });
  const create = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("journal").from("award_rounds").insert({
          awarded_on: form.awarded_on,
          is_published: true,
          shortlist_on: form.shortlist_on,
          slug: form.slug,
          title_ar: form.title.ar,
          title_en: form.title.en,
        })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key });
      router.push("/qirtas/awards");
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate();
  };
  return (
    <RecordPage
      back="/qirtas/awards"
      backLabel={t("title")}
      title={t("newRound")}
    >
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
              <DateInput
                id={id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, shortlist_on: e.target.value }))
                }
                required
                value={form.shortlist_on}
              />
            )}
          </Field>
          <Field label={t("awardedOn")}>
            {(id) => (
              <DateInput
                id={id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, awarded_on: e.target.value }))
                }
                required
                value={form.awarded_on}
              />
            )}
          </Field>
        </div>
        <Button
          className="justify-self-start"
          disabled={create.isPending}
          type="submit"
        >
          {t("addRound")}
        </Button>
        <ErrorLine error={create.error} />
      </form>
    </RecordPage>
  );
};
