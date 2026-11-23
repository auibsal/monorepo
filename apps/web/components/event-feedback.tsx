"use client";

import { ChoiceInput } from "@repo/brand/components/sal/choice-input";
import { Button } from "@repo/brand/components/ui/button";
import { Label } from "@repo/brand/components/ui/label";
import { Textarea } from "@repo/brand/components/ui/textarea";
import { type Locale, localizedPath } from "@repo/internationalization";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useId, useState } from "react";
import { hasSessionCookie } from "@/lib/auth/session-cookie";
import { feedbackOpen, RATINGS } from "@/lib/data/event-times";

const loadClient = async () =>
  (await import("@/lib/diwan/supabase")).getSupabase();
const loadEvents = async () => await import("@/lib/data/events");

type State =
  | "loading"
  | "hidden"
  | "signedOut"
  | "asking"
  | "answered"
  | "thanks";

/**
 * "How was it?" (decisions.md, Events): from the event's start until 14
 * days after its end, someone checked in to it answers once, with five
 * choices and an optional comment; everyone else sees nothing of it
 * (private.feedback_open decides). The event's team reads the count, the
 * average and the comments, never who wrote them.
 * `/events/<slug>#feedback` leads here (the printed program's code and
 * "Thanks for coming"): there, someone signed out is asked to sign in.
 */
export const EventFeedback = ({
  closes,
  endsAt,
  eventId,
  slug,
  startsAt,
}: {
  /** The last day, in the page's language. */
  readonly closes: string;
  readonly endsAt: string | null;
  readonly eventId: string;
  readonly slug: string;
  readonly startsAt: string;
}) => {
  const t = useTranslations("web.events.feedback");
  const locale = useLocale() as Locale;
  const id = useId();
  const [state, setState] = useState<State>("loading");
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!feedbackOpen({ ends_at: endsAt, starts_at: startsAt }, Date.now())) {
      setState("hidden");
      return;
    }
    if (!hasSessionCookie(document.cookie)) {
      // Only someone who came by the program's code or the email's link.
      setState(window.location.hash === "#feedback" ? "signedOut" : "hidden");
      return;
    }
    (async () => {
      const [client, events] = await Promise.all([loadClient(), loadEvents()]);
      if (!(await events.myFeedbackOpen(client, eventId))) {
        setState("hidden");
        return;
      }
      const mine = await events.myFeedback(client, eventId);
      setState(mine ? "answered" : "asking");
    })().catch(() => setState("hidden"));
  }, [endsAt, eventId, startsAt]);

  if (state === "loading" || state === "hidden") {
    // Keeps the place the program's code points at.
    return <span className="sr-only" id="feedback" />;
  }

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!rating) {
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      const [client, events] = await Promise.all([loadClient(), loadEvents()]);
      await events.sendFeedback(client, eventId, {
        comment: comment.trim() || undefined,
        rating: Number(rating),
      });
      setState("thanks");
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const signIn = `${localizedPath(locale, "/sign-in")}?next=${encodeURIComponent(
    `${localizedPath(locale, `/events/${slug}`)}#feedback`
  )}`;

  return (
    <section
      aria-label={t("title")}
      className="border-line grid scroll-mt-24 gap-3 border-t pt-6"
      id="feedback"
    >
      <h2 className="type-heading" id={`${id}-title`}>
        {t("title")}
      </h2>
      {state === "signedOut" ? (
        <p className="type-body">
          <a className="link" href={signIn}>
            {t("signIn")}
          </a>
        </p>
      ) : null}
      {state === "answered" ? (
        <p className="type-body">{t("answered")}</p>
      ) : null}
      {state === "thanks" ? (
        <p className="type-body" role="status">
          {t("thanks")}
        </p>
      ) : null}
      {state === "asking" ? (
        <form className="grid max-w-xl gap-4" onSubmit={send}>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-rating`}>{t("choose")}</Label>
            <ChoiceInput
              id={`${id}-rating`}
              labels={{ choose: t("choose"), find: t("find"), none: t("none") }}
              onChange={(e) => setRating(e.target.value)}
              required
              value={rating}
            >
              {RATINGS.map((r) => (
                <option key={r} value={String(r)}>
                  {t(`ratings.${r}`)}
                </option>
              ))}
            </ChoiceInput>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-comment`}>{t("comment")}</Label>
            <Textarea
              id={`${id}-comment`}
              maxLength={500}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              value={comment}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button disabled={busy || !rating} type="submit">
              {t("send")}
            </Button>
            <span aria-live="polite" className="type-caption">
              {failed ? t("failed") : t("closes", { date: closes })}
            </span>
          </div>
        </form>
      ) : null}
    </section>
  );
};
