"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { type journal, localized, unwrap } from "@/lib/data";
import { Link } from "@/lib/diwan/navigation";
import { DiwanSection, RowList } from "../../page";
import { SectionSpinner } from "../../states";
import {
  BilingualField,
  DateTimeField,
  ErrorLine,
  Field,
  SaveButton,
} from "../kit";

const EDITION_DESKS = ["letters", "gallery", "video"] as const;

const callsKey = (issueId: string) => ["admin", "edition-calls", issueId];

const useCalls = (issueId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("calls")
          .select("*")
          .eq("issue_id", issueId)
      ) ?? [],
    queryKey: callsKey(issueId),
  });
};

type CallRow = NonNullable<ReturnType<typeof useCalls>["data"]>[number];

/**
 * The Edition's one call (decisions.md, Qirtas: one Edition, one title,
 * one call), set here and never typed into another page: its theme line,
 * who may send, its sections, its dates and how many each person may send,
 * and whether it is published. Its title is the Edition's, kept by the
 * site; it can't open until the Edition has its title.
 */
const CallForm = ({
  call,
  issueId,
}: {
  readonly call: CallRow | null;
  readonly issueId: string;
}) => {
  const t = useTranslations("diwan.admin.editionCalls");
  const tj = useTranslations("diwan.admin.journal");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => ({
    closes_at: call?.closes_at ?? null,
    decisions_at: call?.decisions_at ?? null,
    desks: (call?.desks ?? [...EDITION_DESKS]) as journal.Desk[],
    eligibility: {
      ar: call?.eligibility_ar ?? "",
      en: call?.eligibility_en ?? "",
    },
    is_published: call?.is_published ?? false,
    max_per_person: String(call?.max_per_person ?? 2),
    opens_at: call?.opens_at ?? new Date().toISOString(),
    theme: { ar: call?.theme_ar ?? "", en: call?.theme_en ?? "" },
  }));
  const save = useMutation({
    mutationFn: async () => {
      const row = {
        closes_at: form.closes_at ?? "",
        decisions_at: form.decisions_at,
        desks: form.desks,
        eligibility_ar: form.eligibility.ar || null,
        eligibility_en: form.eligibility.en || null,
        is_published: form.is_published,
        max_per_person: Number(form.max_per_person),
        opens_at: form.opens_at ?? new Date().toISOString(),
        theme_ar: form.theme.ar || null,
        theme_en: form.theme.en || null,
        // Kept by the database from the Edition's title.
        title_ar: call?.title_ar ?? "",
        title_en: call?.title_en ?? "",
      };
      const calls = supabase.schema("journal").from("calls");
      unwrap(
        call
          ? await calls.update(row).eq("id", call.id)
          : await calls.insert({ ...row, issue_id: issueId })
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: callsKey(issueId) }),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };
  const toggle = (desk: journal.Desk, on: boolean) =>
    setForm((f) => ({
      ...f,
      desks: on ? [...f.desks, desk] : f.desks.filter((d) => d !== desk),
    }));
  return (
    <form className="grid max-w-4xl gap-5" onSubmit={submit}>
      {call ? (
        <p className="type-subheading">{localized(call, "title", locale)}</p>
      ) : null}
      <BilingualField
        label={t("theme")}
        maxLength={2000}
        multiline
        onChange={(theme) => setForm((f) => ({ ...f, theme }))}
        rows={3}
        value={form.theme}
      />
      <BilingualField
        label={t("eligibility")}
        maxLength={2000}
        multiline
        onChange={(eligibility) => setForm((f) => ({ ...f, eligibility }))}
        rows={3}
        value={form.eligibility}
      />
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">{t("desks")}</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {EDITION_DESKS.map((desk) => (
            <label className="flex items-center gap-2" key={desk}>
              <input
                checked={form.desks.includes(desk)}
                onChange={(e) => toggle(desk, e.target.checked)}
                type="checkbox"
              />
              <span>{tj(`desks.${desk}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <DateTimeField
          label={t("opens")}
          onChange={(opens_at) =>
            setForm((f) => ({ ...f, opens_at: opens_at ?? f.opens_at }))
          }
          required
          value={form.opens_at}
        />
        <DateTimeField
          label={t("closes")}
          onChange={(closes_at) => setForm((f) => ({ ...f, closes_at }))}
          required
          value={form.closes_at}
        />
        <DateTimeField
          label={t("decisions")}
          onChange={(decisions_at) => setForm((f) => ({ ...f, decisions_at }))}
          value={form.decisions_at}
        />
        <Field label={t("maxPerPerson")}>
          {(id) => (
            <Input
              className="max-w-32"
              dir="ltr"
              id={id}
              max={10}
              min={1}
              onChange={(e) =>
                setForm((f) => ({ ...f, max_per_person: e.target.value }))
              }
              required
              type="number"
              value={form.max_per_person}
            />
          )}
        </Field>
      </div>
      <label className="flex items-center gap-2">
        <input
          checked={form.is_published}
          onChange={(e) =>
            setForm((f) => ({ ...f, is_published: e.target.checked }))
          }
          type="checkbox"
        />
        <span>{t("published")}</span>
      </label>
      <SaveButton pending={save.isPending} success={save.isSuccess} />
      <ErrorLine error={save.error} />
    </form>
  );
};

/**
 * An Edition's Call (decisions.md, The site): its one call, its reading
 * period for Letters, Gallery and Video. It opens the day the previous
 * Edition's closes, so exactly one is always open.
 */
export const EditionCalls = ({ issueId }: { readonly issueId: string }) => {
  const t = useTranslations("diwan.admin.editionCalls");
  const calls = useCalls(issueId);
  const [adding, setAdding] = useState(false);
  if (calls.isPending) {
    return <SectionSpinner />;
  }
  const call = calls.data?.[0] ?? null;
  return (
    <DiwanSection id="call" title={t("call")}>
      <p className="type-body text-text-secondary max-w-3xl">{t("callLede")}</p>
      {call || adding ? (
        <CallForm call={call} issueId={issueId} />
      ) : (
        <Button
          className="justify-self-start"
          onClick={() => setAdding(true)}
          type="button"
          variant="outline"
        >
          {t("addCall")}
        </Button>
      )}
    </DiwanSection>
  );
};

/**
 * An Edition's Contents (decisions.md, The site): its pieces by section,
 * each with how far it is and its approvals, for the Editor-in-Chief's and
 * the Managing Editor's approval.
 */
export const EditionContents = ({ issueId }: { readonly issueId: string }) => {
  const t = useTranslations("diwan.admin.editionCalls");
  const tj = useTranslations("diwan.admin.journal");
  const tp = useTranslations("diwan.admin.qirtas");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const pieces = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("pieces")
          .select("id, title_en, title_ar, desk, status, approvals(kind)")
          .eq("issue_id", issueId)
          .order("desk")
      ) ?? [],
    queryKey: ["admin", "edition-contents", issueId],
  });
  if (pieces.isPending) {
    return <SectionSpinner />;
  }
  const rows = pieces.data ?? [];
  return (
    <DiwanSection id="contents" title={t("contents")}>
      <p className="type-body text-text-secondary max-w-3xl">
        {t("contentsLede", { count: formatNumber(rows.length) })}
      </p>
      {rows.length === 0 ? (
        <p className="type-body">{t("noContents")}</p>
      ) : (
        <RowList>
          {rows.map((p) => (
            <li className="grid gap-1" key={p.id}>
              <Link
                className="font-medium underline underline-offset-4"
                href={`/qirtas/pieces/${p.id}`}
              >
                {localized(p, "title", locale) || p.title_en}
              </Link>
              <span className="type-caption">
                {[
                  p.desk ? tj(`desks.${p.desk}`) : null,
                  tp(`statuses.${p.status as journal.PieceStatus}`),
                  t("approvals", {
                    count: formatNumber(p.approvals.length),
                  }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </li>
          ))}
        </RowList>
      )}
    </DiwanSection>
  );
};
