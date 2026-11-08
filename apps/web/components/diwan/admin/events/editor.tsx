"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Label } from "@repo/brand/components/ui/label";
import type { Locale } from "@repo/internationalization";
import {
  formatClock,
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useId, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { events, localized, unwrap } from "@/lib/data";
import { Link } from "@/lib/diwan/navigation";
import { useQueryParam } from "@/lib/diwan/use-query-param";
import { OnTheSite } from "../../site-links";
import { ErrorState, SectionSpinner } from "../../states";
import { AdminHeading, BilingualField, ErrorLine, SaveButton } from "../kit";
import { NotionManaged } from "../notion-managed";
import { RecordHistory } from "../record-history";
import { Attendance } from "./attendance";
import { GuestInvitations } from "./guest-invitations";
import { Invitations } from "./invitations";
import { EventPartsAdmin } from "./parts";

interface Question {
  id: string;
  label_ar: string;
  label_en: string;
  required: boolean;
}

/** Registration questions from the jsonb column (always an array there). */
const asQuestions = (value: unknown): Question[] =>
  Array.isArray(value) ? (value as Question[]) : [];

const newQuestionId = () => `q${Math.random().toString(36).slice(2, 8)}`;

/** A published event's public page, from its page in the Diwan. */
const PublicPage = ({
  slug,
  status,
}: {
  readonly slug?: string | null;
  readonly status: string;
}) =>
  slug && status === "published" ? (
    <OnTheSite href={`/events/${slug}`} />
  ) : null;

/**
 * An event in the Diwan (decisions §8): what Notion holds (the date, the
 * place, the access and the text) is shown, not edited; the site's own
 * parts are kept here: registration questions, invitations, bookings and
 * check-in, and the standard parts.
 */
/** The event's debrief (F-13) in Notion, for its staff (decisions §13). */
const DebriefLink = ({ eventId }: { eventId: string }) => {
  const t = useTranslations("diwan.admin.event");
  const { supabase } = useAuth();
  const debrief = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .from("debriefs")
          .select("url")
          .eq("event_id", eventId)
          .maybeSingle()
      ),
    queryKey: ["admin", "event-debrief", eventId],
  });
  return debrief.data?.url ? (
    <a
      className="link justify-self-start"
      href={debrief.data.url}
      rel="noopener noreferrer"
      target="_blank"
    >
      {t("debrief")}
    </a>
  ) : null;
};

export const EventEditor = () => {
  const t = useTranslations("diwan.admin.event");
  const tk = useTranslations("diwan.admin.kit");
  const locale = useLocale() as Locale;
  const id = useId();
  const eventId = useQueryParam("id");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [problem, setProblem] = useState<string | null>(null);

  const existing = useQuery({
    enabled: Boolean(eventId),
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .from("events")
          .select("*")
          .eq("id", eventId ?? "")
          .maybeSingle()
      ),
    queryKey: ["admin", "event", eventId],
  });

  useEffect(() => {
    if (existing.data) {
      setQuestions(asQuestions(existing.data.questions));
    }
  }, [existing.data]);

  const save = useMutation({
    mutationFn: async () => {
      const parsed = events.eventQuestionsSchema.safeParse(questions);
      if (!parsed.success) {
        setProblem(t("errors.questions"));
        throw new Error("invalid");
      }
      setProblem(null);
      unwrap(
        await supabase
          .schema("events")
          .from("events")
          .update({ questions: parsed.data })
          .eq("id", eventId ?? "")
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin"] }),
  });

  if (existing.isPending) {
    return <SectionSpinner />;
  }
  if (existing.isError) {
    return <ErrorState onRetry={() => existing.refetch()} />;
  }
  const event = existing.data;
  if (!(eventId && event)) {
    return <p className="type-body text-text-secondary">{t("notFound")}</p>;
  }

  const setQuestion = (index: number, patch: Partial<Question>) =>
    setQuestions((qs) =>
      qs.map((q, i) => (i === index ? { ...q, ...patch } : q))
    );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };
  const entry = event.entry as events.Entry;
  const when = [
    `${formatLongDate(event.starts_at, locale, true)}, ${formatClock(event.starts_at, locale)}`,
    event.ends_at ? formatClock(event.ends_at, locale) : null,
  ]
    .filter(Boolean)
    .join("–");
  const facts: [string, string][] = [
    [t("when"), when],
    [t("venue"), localized(event, "venue", locale) || t("noVenue")],
    [t("entry"), `${t(`entries.${entry}`)}. ${t(`entryHint.${entry}`)}`],
    [t("seats"), event.capacity ? formatNumber(event.capacity) : t("noLimit")],
  ];

  return (
    <div className="grid gap-10">
      <AdminHeading
        actions={
          <>
            <Link
              className="text-sm underline underline-offset-4"
              href="/events"
            >
              {tk("back")}
            </Link>
            <PublicPage slug={event.slug} status={event.status} />
          </>
        }
        title={localized(event, "title", locale)}
      >
        {`${tk("status")}: ${tk(`statuses.${event.status as "draft"}`)}`}
      </AdminHeading>
      <NotionManaged kind="event" recordId={eventId} />
      <DebriefLink eventId={eventId} />
      <dl className="grid max-w-4xl gap-x-6 gap-y-3 sm:grid-cols-[10rem_1fr]">
        {facts.map(([term, value]) => (
          <div className="contents" key={term}>
            <dt className="type-label">{term}</dt>
            <dd className="type-body">{value}</dd>
          </div>
        ))}
      </dl>

      {entry === "open" ? null : (
        <form className="grid max-w-4xl gap-4" onSubmit={submit}>
          <h2 className="type-subheading">{t("questions")}</h2>
          <p className="type-caption">{t("questionsHint")}</p>
          {questions.map((question, index) => (
            <div
              className="border-line pt-space-4 grid gap-3 border-t"
              key={question.id}
            >
              <BilingualField
                label={t("question", { number: formatNumber(index + 1) })}
                maxLength={200}
                onChange={(label) =>
                  setQuestion(index, { label_ar: label.ar, label_en: label.en })
                }
                value={{ ar: question.label_ar, en: question.label_en }}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={question.required}
                    id={`${id}-q-${question.id}`}
                    onCheckedChange={(v) =>
                      setQuestion(index, { required: v === true })
                    }
                  />
                  <Label htmlFor={`${id}-q-${question.id}`}>
                    {t("questionRequired")}
                  </Label>
                </div>
                <Button
                  onClick={() =>
                    setQuestions((qs) => qs.filter((_, i) => i !== index))
                  }
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {t("removeQuestion", { number: formatNumber(index + 1) })}
                </Button>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            {questions.length < 10 ? (
              <Button
                onClick={() =>
                  setQuestions((qs) => [
                    ...qs,
                    {
                      id: newQuestionId(),
                      label_ar: "",
                      label_en: "",
                      required: false,
                    },
                  ])
                }
                size="sm"
                type="button"
                variant="outline"
              >
                {t("addQuestion")}
              </Button>
            ) : null}
            <SaveButton pending={save.isPending} success={save.isSuccess} />
          </div>
          {problem ? (
            <p className="text-text text-sm" role="alert">
              {problem}
            </p>
          ) : null}
          {save.error && save.error.message !== "invalid" ? (
            <ErrorLine error={save.error} />
          ) : null}
        </form>
      )}

      {entry === "invite" ? <Invitations eventId={eventId} /> : null}
      {entry === "rsvp" ? <GuestInvitations eventId={eventId} /> : null}
      <Attendance
        capacity={event.capacity}
        eventId={eventId}
        questions={asQuestions(event.questions)}
        slug={event.slug}
      />
      <EventPartsAdmin event={event} />
      <RecordHistory id={eventId} table="events.events" />
    </div>
  );
};
