import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface OpenCall {
  /** Its action: a link or button ("Send your work", "Apply"). */
  readonly action: ReactNode;
  /** "Closes Sunday, December 6" or "Any time", already worded. */
  readonly closes: ReactNode;
  readonly key: string;
  /** What it is for: "Letters, Gallery and Video", "Dreams and memories". */
  readonly purpose?: ReactNode;
  /** The call's title, usually a link to its page. */
  readonly title: ReactNode;
}

/**
 * One listing row for everything people apply or send work to (decisions.md,
 * The site: "One open-call pattern"): title · what it's for · "Closes <date>"
 * or "Any time" · its action. Qirtas's calls, auditions, Get involved's
 * openings, an Edition's cover call, the partner application and
 * nominations all list this way.
 */
const OpenCallRow = ({ call }: { readonly call: OpenCall }) => (
  <li className="border-line grid gap-x-6 gap-y-2 border-t py-4 sm:grid-cols-[1fr_auto] sm:items-baseline">
    <div className="grid min-w-0 gap-1">
      <span className="type-subheading">{call.title}</span>
      <span className="type-caption text-text-secondary">
        {call.purpose ? (
          <>
            {call.purpose}
            <span aria-hidden="true"> · </span>
          </>
        ) : null}
        {call.closes}
      </span>
    </div>
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      {call.action}
    </div>
  </li>
);

/** The calls open now, one row each; the empty line when there are none. */
export const OpenCallList = ({
  calls,
  className,
  empty,
  label,
}: {
  readonly calls: readonly OpenCall[];
  readonly className?: string;
  /** The line shown when nothing is open. */
  readonly empty?: ReactNode;
  /** The list's accessible name ("Open now"). */
  readonly label: string;
}) => {
  if (calls.length > 0) {
    return (
      <ul aria-label={label} className={cn("border-line border-b", className)}>
        {calls.map((call) => (
          <OpenCallRow call={call} key={call.key} />
        ))}
      </ul>
    );
  }
  return empty ? (
    <p className={cn("type-body text-text-secondary", className)}>{empty}</p>
  ) : null;
};

/**
 * A call's terms, after its action (decisions.md, The site: "One call
 * page"): who may apply, what to send, the dates, how it's decided and the
 * reply time, each term with its words.
 */
export const CallDetails = ({
  className,
  rows,
}: {
  readonly className?: string;
  readonly rows: readonly (readonly [string, ReactNode])[];
}) => (
  <dl className={cn("border-line grid max-w-3xl border-t", className)}>
    {rows.map(([term, value]) => (
      <div
        className="border-line grid gap-1 border-b py-3 sm:grid-cols-[12rem_1fr]"
        key={term}
      >
        <dt className="type-label">{term}</dt>
        <dd className="type-body min-w-0">{value}</dd>
      </div>
    ))}
  </dl>
);
