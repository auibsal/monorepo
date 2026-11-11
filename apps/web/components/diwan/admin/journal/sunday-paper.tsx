"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { currentDate } from "@/lib/data/client";
import { SectionSpinner } from "../../states";
import {
  AdminHeading,
  BilingualField,
  ConfirmAction,
  ErrorLine,
  Field,
  SaveButton,
} from "../kit";

const key = ["admin", "qirtas", "sunday-paper"];

/** This month, as YYYY-MM in Baghdad time. */
const thisMonth = () => currentDate().toISOString().slice(0, 7);

/**
 * The Sunday Paper, by hand (decisions §5, §19): the Managing Editor
 * writes the editor's letter, sends a test to the Editor-in-Chief and then
 * sends the issue. The pieces, "From the Society", What's on and the open
 * roles are filled in from the site when it goes. Changing the letter
 * asks for a new test.
 */
export const SundayPaperComposer = () => {
  const t = useTranslations("diwan.admin.sundayPaper");
  const locale = useLocale();
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(thisMonth);
  const [letter, setLetter] = useState({ ar: "", en: "" });
  const state = useQuery({
    queryFn: async () => {
      const [draft, sent] = await Promise.all([
        supabase
          .schema("content")
          .from("sunday_paper_drafts")
          .select("letter_en, letter_ar, tested_at")
          .eq("month", month)
          .maybeSingle(),
        supabase
          .schema("content")
          .from("sunday_paper_issues")
          .select("month, sent_on")
          .order("month", { ascending: false }),
      ]);
      return { draft: unwrap(draft), sent: unwrap(sent) ?? [] };
    },
    queryKey: [...key, month],
  });
  useEffect(() => {
    setLetter({
      ar: state.data?.draft?.letter_ar ?? "",
      en: state.data?.draft?.letter_en ?? "",
    });
  }, [state.data?.draft]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("content").rpc("save_sunday_paper", {
          letter_ar: letter.ar,
          letter_en: letter.en,
          month,
        })
      ),
    onSuccess: refresh,
  });
  const test = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("content").rpc("test_sunday_paper", { month })
      ),
    onSuccess: refresh,
  });
  const send = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("content").rpc("send_sunday_paper", { month })
      ),
    onSuccess: refresh,
  });

  const sentOn = state.data?.sent.find((i) => i.month === month)?.sent_on;
  const testedAt = state.data?.draft?.tested_at;
  const saved =
    state.data?.draft &&
    state.data.draft.letter_en === letter.en.trim() &&
    state.data.draft.letter_ar === letter.ar.trim();

  return (
    <div className="grid gap-8">
      <AdminHeading title={t("title")}>{t("lede")}</AdminHeading>
      <Field label={t("month")}>
        {(id) => (
          <Input
            className="max-w-48"
            dir="ltr"
            id={id}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            type="month"
            value={month}
          />
        )}
      </Field>
      {state.isPending ? <SectionSpinner /> : null}
      {sentOn ? (
        <p className="type-body" role="status">
          {t("sentOn", { date: formatLongDate(sentOn, locale) })}
        </p>
      ) : (
        <>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <BilingualField
              label={t("letter")}
              maxLength={4000}
              multiline
              onChange={setLetter}
              rows={10}
              value={letter}
            />
            <p className="type-caption">{t("letterHint")}</p>
            <SaveButton pending={save.isPending} quiet />
          </form>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={!saved || test.isPending}
              onClick={() => test.mutate()}
              size="sm"
              variant="outline"
            >
              {t("test")}
            </Button>
            <p className="type-caption" role="status">
              {testedAt
                ? t("tested", { date: formatLongDate(testedAt, locale) })
                : t("notTested")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ConfirmAction
              confirmLabel={t("send")}
              description={t("sendConfirm")}
              disabled={!(saved && testedAt) || send.isPending}
              onConfirm={() => send.mutate()}
              variant="default"
            >
              {t("send")}
            </ConfirmAction>
          </div>
        </>
      )}
      <ErrorLine error={save.error ?? test.error ?? send.error} />
    </div>
  );
};
