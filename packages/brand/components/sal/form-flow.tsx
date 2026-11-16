"use client";

import { type ReactNode, useState } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Icon } from "./icon";

/**
 * One form flow (decisions.md, The site): every form people send to the
 * Society (Send your work, an opening's application, an audition, a
 * nomination, the partner application) uses these pieces. They take their
 * words as props, like the rest of the kit.
 */

export interface ReviewWords {
  /** "Back to editing". */
  readonly back: string;
  /** "Review and send". */
  readonly open: string;
  /** "Send". */
  readonly send: string;
  /** "Sending…". */
  readonly sending: string;
  /** "Check what you're sending". */
  readonly title: string;
}

/**
 * Send, with the review step first: the first press shows what goes, the
 * second sends it (the form's submit). Until the form is complete, the
 * reason shows under a disabled button.
 */
export const ReviewStep = ({
  missing,
  rows,
  sending,
  words,
}: {
  /** Why it can't be sent yet, or null. */
  readonly missing?: ReactNode;
  /** What goes: each term with its value. */
  readonly rows: readonly (readonly [string, ReactNode])[];
  readonly sending: boolean;
  readonly words: ReviewWords;
}) => {
  const [reviewing, setReviewing] = useState(false);
  const blocked = Boolean(missing);
  if (!reviewing) {
    return (
      <div className="grid justify-items-start gap-2">
        {missing ? <p className="type-caption">{missing}</p> : null}
        <Button
          disabled={blocked}
          onClick={() => setReviewing(true)}
          type="button"
        >
          {words.open}
        </Button>
      </div>
    );
  }
  return (
    <section
      aria-label={words.title}
      className="border-line grid gap-4 border-y py-5"
    >
      <h2 className="type-heading" id="review">
        {words.title}
      </h2>
      <dl className="grid gap-2 sm:grid-cols-[12rem_1fr]">
        {rows.map(([term, value]) => (
          <div className="contents" key={term}>
            <dt className="type-label">{term}</dt>
            <dd className="type-body min-w-0 whitespace-pre-line">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button disabled={blocked || sending} type="submit">
          {sending ? words.sending : words.send}
        </Button>
        <button
          className="link text-sm"
          onClick={() => setReviewing(false)}
          type="button"
        >
          {words.back}
        </button>
      </div>
    </section>
  );
};

/**
 * The receipt on the page: what was received, its record number, when the
 * person hears back and where to follow it. The "received" email goes out
 * at the same time.
 */
export const Receipt = ({
  actions,
  email,
  number,
  reply,
  title,
}: {
  /** Where to go next: the record in Your account, then another. */
  readonly actions?: ReactNode;
  /** "A confirmation is on its way to your email." */
  readonly email?: string;
  /** "Your number is SUB-2026-0042." */
  readonly number?: string;
  /** The reply time, already worded. */
  readonly reply: ReactNode;
  /** "Received". */
  readonly title: string;
}) => (
  <section aria-label={title} className="grid max-w-3xl gap-4" role="status">
    <h2 className="type-display" id="receipt">
      {title}
    </h2>
    {number ? <p className="type-lede">{number}</p> : null}
    <p className="type-body">{reply}</p>
    {email ? <p className="type-body">{email}</p> : null}
    {actions ? (
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {actions}
      </div>
    ) : null}
  </section>
);

/**
 * Where a record stands, in the same words everywhere in Your account:
 * Received, In review, each flow's own steps, Decision, Withdrawn. The
 * current step is marked; a withdrawn record shows only that.
 */
export const FlowSteps = ({
  className,
  current,
  label,
  steps,
}: {
  readonly className?: string;
  /** The key of the step it is at. */
  readonly current: string;
  /** The list's accessible name ("Where it stands"). */
  readonly label: string;
  /** The flow's steps in order, each with its words. */
  readonly steps: readonly { readonly key: string; readonly label: string }[];
}) => {
  const at = steps.findIndex((s) => s.key === current);
  return (
    <ol
      aria-label={label}
      className={cn("type-caption flex flex-wrap gap-x-2 gap-y-1", className)}
    >
      {steps.map((step, index) => (
        <li
          aria-current={index === at ? "step" : undefined}
          className={cn(
            "flex items-center gap-2",
            index === at ? "text-text font-medium" : "text-text-secondary",
            index > at && at >= 0 ? "opacity-70" : null
          )}
          key={step.key}
        >
          {index > 0 ? (
            <Icon className="rtl:rotate-180" name="arrow-right" />
          ) : null}
          {step.label}
        </li>
      ))}
    </ol>
  );
};
