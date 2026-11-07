"use client";

import { useAuth } from "@repo/auth/provider";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import {
  governance,
  localized,
  sanitizeRichText,
  unwrap,
} from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";
import { DateInput } from "@/components/fields/date-input";
import { Link, useRouter } from "@/lib/diwan/navigation";
import { useQueryParam } from "@/lib/diwan/use-query-param";
import { Collaboration } from "../../editor/collaboration";
import {
  CollaborativeRichTextEditor,
  RichTextEditor,
} from "../../editor/rich-text";
import { ErrorState, SectionSpinner } from "../../states";
import {
  AdminHeading,
  BilingualField,
  ConfirmAction,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";
import { NotionManaged } from "../notion-managed";
import { MeetingResolutions } from "./admin";

type Body = governance.MeetingBody;

/**
 * A meeting (the Council, a general meeting, the Annual Meeting, a special
 * meeting or the Founding Meeting): its minutes, co-edited
 * by the General Secretary and the Council and draft until adopted, and
 * under them the resolutions it adopted.
 */
export const MinutesEditor = () => {
  const t = useTranslations("diwan.admin.governance");
  const tk = useTranslations("diwan.admin.kit");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const minutesId = useQueryParam("id");
  // From an event's page in What's on: the meeting the minutes are of.
  const fromEvent = useQueryParam("event");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    body: "council" as Body,
    event_id: fromEvent ?? "",
    meeting_on: new Date().toISOString().slice(0, 10),
    text: { ar: "", en: "" },
    title: { ar: "", en: "" },
  });
  const [adoptedOn, setAdoptedOn] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const existing = useQuery({
    enabled: Boolean(minutesId),
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("minutes")
          .select("*")
          .eq("id", minutesId ?? "")
          .maybeSingle()
      ),
    queryKey: ["admin", "governance", "minutes", minutesId],
  });

  useEffect(() => {
    const m = existing.data;
    if (m) {
      setForm({
        body: m.body as Body,
        event_id: m.event_id ?? "",
        meeting_on: m.meeting_on,
        text: { ar: m.text_ar ?? "", en: m.text_en },
        title: { ar: m.title_ar ?? "", en: m.title_en },
      });
    }
  }, [existing.data]);

  const adopted = existing.data?.status === "adopted";

  // Meetings are events made in What's on (owner, Nov 5, 2026): the
  // minutes name theirs, and take its day.
  const meetings = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .from("events")
          .select("id, title_en, title_ar, starts_at")
          .gte("starts_at", new Date(Date.now() - 400 * 864e5).toISOString())
          .order("starts_at", { ascending: false })
          .limit(200)
      ) ?? [],
    queryKey: ["admin", "governance", "meeting-events"],
  });

  const save = useMutation({
    mutationFn: async (adopt: boolean) => {
      const row = {
        adopted_on: adopt ? adoptedOn : (existing.data?.adopted_on ?? null),
        body: form.body,
        event_id: form.event_id || null,
        meeting_on: form.meeting_on,
        status: adopt || adopted ? "adopted" : "draft",
        text_ar: sanitizeRichText(form.text.ar) || null,
        text_en: sanitizeRichText(form.text.en),
        title_ar: form.title.ar || null,
        title_en: form.title.en,
      };
      const table = supabase.schema("governance").from("minutes");
      if (minutesId) {
        unwrap(await table.update(row).eq("id", minutesId));
        return minutesId;
      }
      const created = unwrap(await table.insert(row).select("id").single());
      if (!created) {
        throw new Error("not_created");
      }
      return created.id;
    },
    onSuccess: async (savedId) => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "governance"],
      });
      if (!minutesId) {
        router.replace(`/council/meetings/${savedId}`);
      }
    },
  });

  if (minutesId && existing.isPending) {
    return <SectionSpinner />;
  }
  if (existing.isError) {
    return <ErrorState onRetry={() => existing.refetch()} />;
  }
  if (minutesId && !existing.data) {
    return (
      <p className="type-body text-text-secondary">{t("minutes.notFound")}</p>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate(false);
  };

  const setText = (patch: { ar?: string; en?: string }) =>
    setForm((f) => ({ ...f, text: { ...f.text, ...patch } }));
  const solo = (
    <div className="grid gap-4">
      <RichTextEditor
        label={`${t("minutes.text")} (${tk("english")})`}
        lang="en"
        onChange={(en) => setText({ en })}
        value={form.text.en}
      />
      <RichTextEditor
        label={`${t("minutes.text")} (${tk("arabic")})`}
        lang="ar"
        onChange={(ar) => setText({ ar })}
        value={form.text.ar}
      />
    </div>
  );

  return (
    <div className="grid gap-8">
      <AdminHeading
        actions={
          <Link
            className="text-sm underline underline-offset-4"
            href="/council"
          >
            {tk("back")}
          </Link>
        }
        title={
          existing.data
            ? localized(existing.data, "title", locale)
            : t("minutes.new")
        }
      >
        {adopted && existing.data?.adopted_on
          ? `${t("statuses.adopted")}, ${formatLongDate(existing.data.adopted_on, locale, true)}`
          : t("statuses.draft")}
      </AdminHeading>
      <NotionManaged kind="minutes" recordId={minutesId} />
      <form className="grid max-w-4xl gap-6" onSubmit={submit}>
        <BilingualField
          label={t("minutes.titleField")}
          maxLength={300}
          onChange={(title) => setForm((f) => ({ ...f, title }))}
          required
          value={form.title}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("minutes.meeting")}>
            {(id) => (
              <SelectInput
                id={id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, event_id: e.target.value }))
                }
                value={form.event_id}
              >
                <option value="">{t("minutes.noMeeting")}</option>
                {(meetings.data ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {`${localized(m, "title", locale)} · ${formatLongDate(m.starts_at, locale, true)}`}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          {form.event_id ? null : (
            <Field label={t("minutes.meetingOn")}>
              {(id) => (
                <DateInput
                  id={id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, meeting_on: e.target.value }))
                  }
                  required
                  value={form.meeting_on}
                />
              )}
            </Field>
          )}
          <Field label={t("minutes.body")}>
            {(id) => (
              <SelectInput
                id={id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, body: e.target.value as Body }))
                }
                value={form.body}
              >
                {governance.meetingBodies.map((b) => (
                  <option key={b} value={b}>
                    {t(`bodies.${b}`)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
        </div>
        <fieldset className="grid gap-3">
          <legend className="mb-2 font-medium text-sm">
            {t("minutes.text")}
          </legend>
          {minutesId ? (
            <Collaboration id={minutesId} kind="minutes" solo={solo}>
              <div className="grid gap-4">
                <CollaborativeRichTextEditor
                  field="text_en"
                  label={`${t("minutes.text")} (${tk("english")})`}
                  lang="en"
                  onChange={(en) => setText({ en })}
                  value={form.text.en}
                />
                <CollaborativeRichTextEditor
                  field="text_ar"
                  label={`${t("minutes.text")} (${tk("arabic")})`}
                  lang="ar"
                  onChange={(ar) => setText({ ar })}
                  value={form.text.ar}
                />
              </div>
            </Collaboration>
          ) : (
            solo
          )}
        </fieldset>
        <p className="type-caption">{t("minutes.draftNote")}</p>
        <div className="flex flex-wrap items-end gap-3">
          {/* Adopted minutes are the official copy; the database refuses
              any change to them (Nov 4, 2026). */}
          {adopted ? (
            <p className="type-caption">{t("minutes.locked")}</p>
          ) : (
            <SaveButton pending={save.isPending} success={save.isSuccess} />
          )}
          {minutesId && !adopted ? (
            <>
              <Field className="w-44" label={t("minutes.adoptedOn")}>
                {(id) => (
                  <DateInput
                    id={id}
                    onChange={(e) => setAdoptedOn(e.target.value)}
                    value={adoptedOn}
                  />
                )}
              </Field>
              <ConfirmAction
                confirmLabel={t("minutes.adopt")}
                description={t("minutes.adoptConfirm")}
                disabled={save.isPending}
                onConfirm={() => save.mutate(true)}
                variant="default"
              >
                {t("minutes.adopt")}
              </ConfirmAction>
            </>
          ) : null}
        </div>
        <ErrorLine error={save.error} />
      </form>
      {/* The resolutions this meeting adopted. */}
      {minutesId ? <MeetingResolutions meetingId={minutesId} /> : null}
    </div>
  );
};
