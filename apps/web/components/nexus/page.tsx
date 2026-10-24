import { SectionHead } from "@repo/design-system/components/sal/section-head";
import { cn } from "@repo/design-system/lib/utils";
import type { ReactNode } from "react";

/**
 * A Diwan page: the Light display title, one line on what the page is for,
 * an optional row of text links, then the sections. Every page starts at
 * the same edge as the masthead; `narrow` keeps forms and reading to a
 * comfortable measure without centering them.
 */
export const DiwanPage = ({
  actions,
  children,
  kicker,
  lede,
  narrow = false,
  title,
}: {
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly kicker?: ReactNode;
  readonly lede?: ReactNode;
  readonly narrow?: boolean;
  readonly title: ReactNode;
}) => (
  <div className={cn("grid content-start gap-14", narrow && "max-w-3xl")}>
    <header className="grid gap-4">
      {kicker ? <p className="type-label">{kicker}</p> : null}
      <h1 className="type-display text-balance">{title}</h1>
      {lede ? (
        <p className="type-lede max-w-[48ch] text-text-secondary">{lede}</p>
      ) : null}
      {actions ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {actions}
        </div>
      ) : null}
    </header>
    {children}
  </div>
);

/**
 * A Diwan section: the Bookmark and a 28 px title (the site's section head
 * at the portal's size), an optional line on what it holds, an optional
 * text link at the end of the title, then the content.
 */
export const DiwanSection = ({
  action,
  children,
  className,
  description,
  id,
  title,
}: {
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly description?: ReactNode;
  readonly id: string;
  readonly title: ReactNode;
}) => (
  <section
    aria-labelledby={id}
    className={cn("grid content-start gap-5", className)}
  >
    <div className="grid gap-2">
      <SectionHead action={action} size="heading" title={title} titleId={id} />
      {description ? (
        <p className="type-body max-w-[60ch] text-text-secondary">
          {description}
        </p>
      ) : null}
    </div>
    {children}
  </section>
);

/** Rows on hairlines between them, never above the first or below the last. */
export const RowList = ({
  children,
  className,
  ordered = false,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly ordered?: boolean;
}) => {
  const List = ordered ? "ol" : "ul";
  return (
    <List
      className={cn(
        "grid divide-y divide-line [&>li:first-child]:pt-0 [&>li:last-child]:pb-0 [&>li]:py-4",
        className
      )}
    >
      {children}
    </List>
  );
};
