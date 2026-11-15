import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface SectionFrontProps {
  /** The main action, then any text links, in one row that wraps. */
  readonly actions?: ReactNode;
  /** The lists and everything else, after the action. */
  readonly children?: ReactNode;
  readonly className?: string;
  /** One sentence under the title. */
  readonly line?: ReactNode;
  /** A short line under the actions (the section's editor, a count). */
  readonly note?: ReactNode;
  readonly title: ReactNode;
  readonly titleId?: string;
}

/**
 * One section front page (decisions.md, The site: "One pattern for each
 * kind of thing"): the title, one line, the action, then the lists. Every
 * section opens this way (Qirtas's six, Events, the Company, Next Stop, Get
 * involved, Partners, the Library); never rules or a poster before the
 * action.
 */
export const SectionFront = ({
  actions,
  children,
  className,
  line,
  note,
  title,
  titleId,
}: SectionFrontProps) => (
  <div className={cn("grid gap-10", className)}>
    <header className="grid gap-3">
      <h1 className="type-display max-w-4xl text-balance" id={titleId}>
        {title}
      </h1>
      {line ? <p className="type-lede max-w-3xl">{line}</p> : null}
      {actions ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
          {actions}
        </div>
      ) : null}
      {note ? (
        <div className="type-caption text-text-secondary grid gap-2">
          {note}
        </div>
      ) : null}
    </header>
    {children}
  </div>
);
