"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { DataError, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { CardScanner, parseCard } from "../card-scanner";
import { ErrorLine } from "../kit";
import { useMemberNames } from "../member-picker";
import { memberName } from "../members/directory";

const ARABIC = /[؀-ۿ]/;
const SPACE = /\s+/;
const words = (text: string) => text.trim().split(SPACE).filter(Boolean);
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
 * Six Words from the Typewriter Tour (owner, 2026-10-25): never written on
 * the site. Whoever runs the Tour types each card as written, then either
 * scans the writer's membership card, which saves it as theirs, or saves
 * it unsigned and attaches a card later. A transcribed card is on the wall
 * at once; take one down if it shouldn't be.
 */
export const TourCards = () => {
  const t = useTranslations("nexus.admin.programmes.sixWords");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const fieldId = useId();
  const [text, setText] = useState("");
  const [scanning, setScanning] = useState<"new" | string | null>(null);
  const [problem, setProblem] = useState<
    "notLive" | "unknownCard" | "notCard" | null
  >(null);
  const count = words(text).length;

  const recent = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("six_words")
          .select("id, user_id, text, language, status, created_at")
          .order("created_at", { ascending: false })
          .limit(40)
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
          words: words(text).join(" "),
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
  const takeDown = useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await supabase
          .schema("programmes")
          .rpc("moderate_six_words", { approve: false, entry_id: id })
      ),
    onSuccess: refresh,
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

  const nameOf = (userId: string | null) => {
    const person = names.data?.find((n) => n.id === userId);
    return person ? memberName(person, locale) : t("unsigned");
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
          onChange={(event) => setText(event.target.value)}
          rows={2}
          value={text}
        />
        <p aria-live="polite" className="type-caption">
          {t("count", { count: formatNumber(count) })}
        </p>
        {count === 6 ? (
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
                <p
                  className="type-heading font-light"
                  dir="auto"
                  lang={w.language}
                >
                  {w.text}
                </p>
                <p className="type-caption">
                  {nameOf(w.user_id)}
                  {w.status === "rejected" ? ` · ${t("takenDown")}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {w.user_id ? null : (
                  <Button
                    onClick={() => setScanning(w.id)}
                    size="sm"
                    variant="outline"
                  >
                    {t("attach")}
                  </Button>
                )}
                {w.status === "rejected" ? null : (
                  <Button
                    disabled={takeDown.isPending}
                    onClick={() => takeDown.mutate(w.id)}
                    size="sm"
                    variant="ghost"
                  >
                    {t("takeDown")}
                  </Button>
                )}
              </div>
              {scanning === w.id ? <CardScanner onCode={onScan} /> : null}
            </li>
          ))}
        </ul>
        <ErrorLine error={cardProblem(attach.error) ? null : attach.error} />
        <ErrorLine error={takeDown.error} />
      </section>
    </div>
  );
};
