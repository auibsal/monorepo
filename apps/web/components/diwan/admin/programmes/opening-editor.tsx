"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import type { Locale } from "@repo/internationalization";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { localized, programmes, unwrap } from "@/lib/data";
import { Link } from "@/lib/diwan/navigation";
import { OnTheSite } from "../../site-links";
import { ErrorState, PageSpinner } from "../../states";
import {
  AdminHeading,
  BilingualField,
  ConfirmAction,
  DateTimeField,
  ErrorLine,
  Field,
  SaveButton,
} from "../kit";
import { MemberPicker, type Person, useMemberNames } from "../member-picker";
import type { openingKinds } from "./openings";

/** The appointed director seats: they open after the Executive Board's approval. */
const DIRECTOR_ROLES = new Set([
  "artistic_director",
  "events_director",
  "partnerships_director",
  "membership_director",
  "media_director",
]);

type Kind = (typeof openingKinds)[number];

const COLUMNS =
  "id, kind, owner, role, title_en, title_ar, body_en, body_ar, eligibility_en, eligibility_ar, questions, asks_files, second_reviewer, eb_resolution, eb_approved_at, closes_at, is_open, places, event_id";

/** The opening's questions, each in both languages (decisions.md, Get involved and roles). */
const QuestionsEditor = ({
  onChange,
  value,
}: {
  readonly onChange: (questions: programmes.Question[]) => void;
  readonly value: readonly programmes.Question[];
}) => {
  const t = useTranslations("diwan.admin.programmes.openings");
  const set = (index: number, change: Partial<programmes.Question>) =>
    onChange(value.map((q, i) => (i === index ? { ...q, ...change } : q)));
  return (
    <fieldset className="grid gap-4">
      <legend className="text-sm font-medium">{t("questions")}</legend>
      {value.map((q, index) => (
        <div className="border-line grid gap-3 border-t pt-3" key={q.key}>
          <BilingualField
            label={t("question", { n: String(index + 1) })}
            maxLength={300}
            onChange={(text) => set(index, { ar: text.ar, en: text.en })}
            value={{ ar: q.ar, en: q.en }}
          />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="flex items-center gap-2">
              <Checkbox
                checked={q.required}
                id={`q-${q.key}`}
                onCheckedChange={(v) => set(index, { required: v === true })}
              />
              <Label htmlFor={`q-${q.key}`}>{t("questionRequired")}</Label>
            </span>
            <button
              className="link type-caption"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              type="button"
            >
              {t("questionRemove")}
            </button>
          </div>
        </div>
      ))}
      {value.length < 8 ? (
        <button
          className="link justify-self-start text-sm"
          onClick={() =>
            onChange([
              ...value,
              {
                ar: "",
                en: "",
                key: `q${Date.now().toString(36)}`,
                required: true,
              },
            ])
          }
          type="button"
        >
          {t("questionAdd")}
        </button>
      ) : null}
    </fieldset>
  );
};

/** Where an opening lives in the Diwan: its list, which the page returns to. */
export interface OpeningEditorProps {
  /** The list's own path ("/membership/openings"). */
  readonly back: string;
  readonly id: string;
}

/**
 * One opening, on its own page (decisions.md: editing in the Diwan
 * opens its own address, one step under its list). Every opening edits the
 * same way, whichever list it is on: its title and description, the
 * skills it wants, when it closes, and for an event team or Qalam mentors
 * the number of places. Its kind (and a role opening's role or an event
 * team's event) stays as posted (decisions.md: open roles only). Closing takes it off Get involved; reopening puts it back.
 */
export const OpeningEditor = ({ back, id }: OpeningEditorProps) => {
  const t = useTranslations("diwan.admin.programmes.openings");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["admin", "opening", id];

  const opening = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("openings")
          .select(COLUMNS)
          .eq("id", id)
          .maybeSingle()
      ),
    queryKey,
  });
  const kind = (opening.data?.kind ?? "role") as Kind;

  const [form, setForm] = useState({
    asks_files: false,
    body: { ar: "", en: "" },
    closes_at: null as string | null,
    eb_resolution: "",
    eligibility: { ar: "", en: "" },
    places: "",
    questions: [] as programmes.Question[],
    second_reviewer: null as Person | null,
    title: { ar: "", en: "" },
  });
  const reviewerNames = useMemberNames([opening.data?.second_reviewer]);
  // The form starts from the opening as saved.
  useEffect(() => {
    const row = opening.data;
    if (row) {
      const reviewer = reviewerNames.data?.find(
        (p) => p.id === row.second_reviewer
      );
      setForm({
        asks_files: row.asks_files,
        body: { ar: row.body_ar ?? "", en: row.body_en ?? "" },
        closes_at: row.closes_at,
        eb_resolution: row.eb_resolution ?? "",
        eligibility: {
          ar: row.eligibility_ar ?? "",
          en: row.eligibility_en ?? "",
        },
        places: row.places ? String(row.places) : "",
        questions: programmes.questionsOf(row.questions),
        second_reviewer: reviewer ?? null,
        title: { ar: row.title_ar ?? "", en: row.title_en ?? "" },
      });
    }
  }, [opening.data, reviewerNames.data]);
  const director = DIRECTOR_ROLES.has(opening.data?.role ?? "");

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: ["admin"] }),
      queryClient.invalidateQueries({ queryKey: ["open-places"] }),
      queryClient.invalidateQueries({ queryKey: ["openings"] }),
    ]);

  const save = useMutation({
    mutationFn: async () => {
      const place = kind !== "role";
      return unwrap(
        await supabase
          .schema("programmes")
          .from("openings")
          .update({
            asks_files: form.asks_files,
            body_ar: form.body.ar || null,
            body_en: form.body.en || null,
            closes_at: form.closes_at,
            eb_approved_at:
              director && form.eb_resolution.trim()
                ? (opening.data?.eb_approved_at ?? new Date().toISOString())
                : null,
            eb_resolution: director ? form.eb_resolution.trim() || null : null,
            eligibility_ar: form.eligibility.ar || null,
            eligibility_en: form.eligibility.en || null,
            places: place && form.places ? Number(form.places) : null,
            questions: form.questions.filter((q) => q.en.trim() && q.ar.trim()),
            second_reviewer: form.second_reviewer?.id ?? null,
            title_ar: form.title.ar,
            title_en: form.title.en,
          })
          .eq("id", id)
      );
    },
    onSuccess: refresh,
  });
  const toggle = useMutation({
    mutationFn: async (open: boolean) =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("openings")
          .update({ is_open: open })
          .eq("id", id)
      ),
    onSuccess: refresh,
  });

  if (opening.isPending) {
    return <PageSpinner />;
  }
  if (opening.isError) {
    return <ErrorState onRetry={() => opening.refetch()} />;
  }
  if (!opening.data) {
    return (
      <div className="grid gap-4">
        <AdminHeading title={t("missing")} />
        <Link className="link justify-self-start" href={back}>
          {t("back")}
        </Link>
      </div>
    );
  }
  const row = opening.data;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <div className="grid max-w-3xl gap-8">
      <AdminHeading
        actions={
          <>
            <Link className="link" href={back}>
              {t("back")}
            </Link>
            {/* Where everyone reads it: Get involved. */}
            <OnTheSite href="/get-involved" />
          </>
        }
        title={localized(row, "title", locale) || t("untitled")}
      >
        {[t(`kinds.${kind}`), row.is_open ? t("open") : t("closed")].join(
          " · "
        )}
      </AdminHeading>

      <form className="grid gap-4" onSubmit={submit}>
        <BilingualField
          label={t("title")}
          maxLength={200}
          onChange={(title) => setForm((f) => ({ ...f, title }))}
          required={kind !== "role"}
          value={form.title}
        />
        <BilingualField
          label={t("body")}
          maxLength={2000}
          multiline
          onChange={(body) => setForm((f) => ({ ...f, body }))}
          rows={4}
          value={form.body}
        />
        <BilingualField
          label={t("eligibility")}
          maxLength={600}
          multiline
          onChange={(eligibility) => setForm((f) => ({ ...f, eligibility }))}
          rows={2}
          value={form.eligibility}
        />
        <QuestionsEditor
          onChange={(questions) => setForm((f) => ({ ...f, questions }))}
          value={form.questions}
        />
        <div className="flex items-start gap-3">
          <Checkbox
            checked={form.asks_files}
            id={`${id}-files`}
            onCheckedChange={(v) =>
              setForm((f) => ({ ...f, asks_files: v === true }))
            }
          />
          <Label className="leading-normal" htmlFor={`${id}-files`}>
            {t("asksFiles")}
          </Label>
        </div>
        <MemberPicker
          label={t("secondReviewer")}
          onChange={(second_reviewer) =>
            setForm((f) => ({ ...f, second_reviewer }))
          }
          value={form.second_reviewer}
        />
        {director ? (
          <Field hint={t("ebHint")} label={t("ebResolution")}>
            {(fieldId) => (
              <Input
                className="max-w-xs"
                dir="ltr"
                id={fieldId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, eb_resolution: e.target.value }))
                }
                placeholder={t("ebPlaceholder")}
                value={form.eb_resolution}
              />
            )}
          </Field>
        ) : null}
        {kind === "role" ? null : (
          <Field label={t("places")}>
            {(fieldId) => (
              <Input
                className="max-w-xs"
                dir="ltr"
                id={fieldId}
                max={100}
                min={1}
                onChange={(e) =>
                  setForm((f) => ({ ...f, places: e.target.value }))
                }
                type="number"
                value={form.places}
              />
            )}
          </Field>
        )}
        <DateTimeField
          label={t("closes")}
          onChange={(closes_at) => setForm((f) => ({ ...f, closes_at }))}
          value={form.closes_at}
        />
        <SaveButton pending={save.isPending} success={save.isSuccess} />
        <ErrorLine error={save.error} />
      </form>

      <div className="border-line pt-space-4 grid gap-2 border-t">
        {row.is_open ? (
          <ConfirmAction
            confirmLabel={t("close")}
            description={t("closeConfirm")}
            disabled={toggle.isPending}
            onConfirm={() => toggle.mutate(false)}
            variant="ghost"
          >
            {t("close")}
          </ConfirmAction>
        ) : (
          <Button
            className="justify-self-start"
            disabled={toggle.isPending}
            onClick={() => toggle.mutate(true)}
            size="sm"
            variant="ghost"
          >
            {t("reopen")}
          </Button>
        )}
        <ErrorLine error={toggle.error} />
      </div>
    </div>
  );
};
