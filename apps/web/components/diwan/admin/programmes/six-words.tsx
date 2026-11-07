"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { Textarea } from "@repo/brand/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { DataError, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { PagePhoto } from "../../tour-station";
import { CardScanner, parseCard } from "../card-scanner";
import { ErrorLine } from "../kit";
import { MemberPicker, type Person, useMemberNames } from "../member-picker";
import { memberName } from "../members/directory";

const ARABIC = /[؀-ۿ]/;
const MAX = 400;
const queryKey = ["admin", "programmes", "six-words"];

/** The message for a card the database refused. */
const cardProblem = (error: unknown) => {
  if (error instanceof DataError && error.message.includes("card_not_live")) {
    return "notLive" as const;
  }
  if (error instanceof DataError && error.code === "P0002") {
    return "unknownCard" as const;
  }
  return null;
};

/**
 * Pages from the Typewriter Tour (owner, Nov 7, 2026: not part of Qirtas).
 * Whoever runs the Tour types each page as written, then either scans the
 * writer's membership card, which makes it theirs, or saves it unsigned
 * and attaches it later: by card, or (a claim through Help Desk) to the
 * member by name. Every page is private until its writer chooses their
 * profile or the Tour's page; an editor may mark one not publishable.
 */
export const TourCards = () => {
  const t = useTranslations("diwan.admin.programmes.sixWords");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const fieldId = useId();
  const [text, setText] = useState("");
  const [scanning, setScanning] = useState<"new" | string | null>(null);
  const [problem, setProblem] = useState<
    "notLive" | "unknownCard" | "notCard" | null
  >(null);
  const count = text.trim().length;

  const recent = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("six_words")
          .select(
            "id, user_id, text, language, visibility, publishable, writer_name, station, tour, photo_path, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(100)
      ) ?? [],
    queryKey,
  });
  const names = useMemberNames(recent.data?.map((w) => w.user_id) ?? []);
  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const record = useMutation({
    mutationFn: async (card: { card_code: string; digits: string } | null) =>
      unwrap(
        await supabase.schema("programmes").rpc("record_six_words", {
          language: ARABIC.test(text) ? "ar" : "en",
          words: text.trim(),
          ...(card ?? {}),
        })
      ),
    onError: (error) => setProblem(cardProblem(error)),
    onSuccess: async () => {
      setText("");
      setScanning(null);
      setProblem(null);
      await refresh();
    },
  });
  const attach = useMutation({
    mutationFn: async ({
      card,
      id,
    }: {
      card: { card_code: string; digits: string };
      id: string;
    }) =>
      unwrap(
        await supabase
          .schema("programmes")
          .rpc("attach_six_words", { entry_id: id, ...card })
      ),
    onError: (error) => setProblem(cardProblem(error)),
    onSuccess: async () => {
      setScanning(null);
      setProblem(null);
      await refresh();
    },
  });
  const publishable = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) =>
      unwrap(
        await supabase
          .schema("programmes")
          .rpc("moderate_six_words", { approve: value, entry_id: id })
      ),
    onSuccess: refresh,
  });
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimant, setClaimant] = useState<Person | null>(null);
  const claim = useMutation({
    mutationFn: async ({ id, member }: { id: string; member: string }) =>
      unwrap(
        await supabase
          .schema("programmes")
          .rpc("attach_page_to_member", { entry_id: id, member_id: member })
      ),
    onSuccess: async () => {
      setClaiming(null);
      setClaimant(null);
      await refresh();
    },
  });

  const onScan = (value: string) => {
    const card = parseCard(value);
    if (!card) {
      setProblem("notCard");
      return;
    }
    if (scanning === "new") {
      record.mutate(card);
    } else if (scanning) {
      attach.mutate({ card, id: scanning });
    }
  };

  const nameOf = (userId: string | null, writer: string | null) => {
    const person = names.data?.find((n) => n.id === userId);
    if (person) {
      return memberName(person, locale);
    }
    return writer ? t("unclaimed", { name: writer }) : t("unsigned");
  };

  return (
    <div className="grid gap-8">
      <p className="type-body max-w-3xl text-text-secondary">{t("lede")}</p>

      <section className="grid max-w-2xl gap-3">
        <h3 className="type-subheading">{t("transcribe")}</h3>
        <label className="type-caption" htmlFor={fieldId}>
          {t("hint")}
        </label>
        <Textarea
          dir="auto"
          id={fieldId}
          maxLength={MAX}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          value={text}
        />
        <p aria-live="polite" className="type-caption">
          {t("count", { count: formatNumber(count) })}
        </p>
        {count > 0 ? (
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={record.isPending}
              onClick={() => setScanning("new")}
            >
              {t("scanToSave")}
            </Button>
            <Button
              disabled={record.isPending}
              onClick={() => record.mutate(null)}
              variant="outline"
            >
              {t("saveUnsigned")}
            </Button>
          </div>
        ) : null}
        {scanning === "new" ? <CardScanner onCode={onScan} /> : null}
      </section>

      {problem ? (
        <p className="type-body font-medium" role="alert">
          {t(`problems.${problem}`)}
        </p>
      ) : null}
      <ErrorLine error={cardProblem(record.error) ? null : record.error} />

      <section className="grid gap-3">
        <h3 className="type-subheading">{t("recent")}</h3>
        {recent.data?.length === 0 ? (
          <p className="type-body text-text-secondary">{t("empty")}</p>
        ) : null}
        <ul className="grid divide-y divide-line">
          {recent.data?.map((w) => (
            <li className="grid gap-2 py-3" key={w.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                {w.text ? (
                  <p
                    className="type-heading font-light"
                    dir="auto"
                    lang={w.language}
                  >
                    {w.text}
                  </p>
                ) : (
                  <p className="type-body text-text-secondary">
                    {t("toTranscribe")}
                  </p>
                )}
                <p className="type-caption">
                  {[
                    nameOf(w.user_id, w.writer_name),
                    w.station,
                    t(`visibility.${w.visibility as "private"}`),
                    w.publishable ? null : t("notPublishable"),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {w.user_id ? null : (
                  <>
                    <Button
                      onClick={() => setScanning(w.id)}
                      size="sm"
                      variant="outline"
                    >
                      {t("attach")}
                    </Button>
                    <Button
                      onClick={() => setClaiming(w.id)}
                      size="sm"
                      variant="ghost"
                    >
                      {t("attachByName")}
                    </Button>
                  </>
                )}
                <Button
                  disabled={publishable.isPending}
                  onClick={() =>
                    publishable.mutate({ id: w.id, value: !w.publishable })
                  }
                  size="sm"
                  variant="ghost"
                >
                  {w.publishable ? t("takeDown") : t("putBack")}
                </Button>
              </div>
              {w.photo_path ? <PagePhoto id={w.id} /> : null}
              {w.photo_path && !w.text ? (
                <Transcribe id={w.id} onDone={refresh} />
              ) : null}
              {scanning === w.id ? <CardScanner onCode={onScan} /> : null}
              {claiming === w.id ? (
                <div className="grid max-w-md gap-3">
                  <MemberPicker
                    label={t("claimant")}
                    onChange={setClaimant}
                    value={claimant}
                  />
                  <Button
                    className="justify-self-start"
                    disabled={!claimant || claim.isPending}
                    onClick={() =>
                      claimant &&
                      claim.mutate({ id: w.id, member: claimant.id })
                    }
                    size="sm"
                  >
                    {t("attachConfirm")}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        <ErrorLine error={cardProblem(attach.error) ? null : attach.error} />
        <ErrorLine error={publishable.error ?? claim.error} />
      </section>
    </div>
  );
};

/**
 * A page the station photographed, typed from its photograph by whoever
 * runs the Tour (`programmes.transcribe_page`): only then can it show on
 * the writer's profile or the Tour's page, as the writer chooses.
 */
const Transcribe = ({ id, onDone }: { id: string; onDone: () => void }) => {
  const t = useTranslations("diwan.admin.programmes.sixWords");
  const { supabase } = useAuth();
  const fieldId = useId();
  const [words, setWords] = useState("");
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("programmes").rpc("transcribe_page", {
          lang: ARABIC.test(words) ? "ar" : "en",
          page_id: id,
          words: words.trim(),
        })
      ),
    onSuccess: onDone,
  });
  return (
    <div className="grid max-w-2xl gap-2">
      <label className="type-caption" htmlFor={fieldId}>
        {t("transcribeHint")}
      </label>
      <Textarea
        dir="auto"
        id={fieldId}
        maxLength={MAX}
        onChange={(event) => setWords(event.target.value)}
        rows={2}
        value={words}
      />
      <Button
        className="justify-self-start"
        disabled={!words.trim() || save.isPending}
        onClick={() => save.mutate()}
        size="sm"
        variant="outline"
      >
        {t("saveWords")}
      </Button>
      <ErrorLine error={save.error} />
    </div>
  );
};
