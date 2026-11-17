import { SectionHead } from "@repo/brand/components/sal/section-head";
import { cn } from "@repo/brand/lib/utils";
import type { ReactNode } from "react";

/**
 * A page in Your account or the Diwan: its title only (decisions.md, The
 * site: "Say it once, say it short"; how a workflow runs lives in the
 * seat's manual), an optional row of text links, then the sections. Every
 * page starts at the same edge as the masthead; `narrow` keeps forms and
 * reading to a comfortable measure without centering them.
 */
export const DiwanPage = ({
  actions,
  children,
  narrow = false,
  sentence,
  title,
}: {
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly narrow?: boolean;
  /** Public pages in this frame only (Get involved): one sentence. */
  readonly sentence?: string;
  readonly title: ReactNode;
}) => (
  <div className={cn("grid content-start gap-14", narrow && "max-w-3xl")}>
    <header className="grid gap-4">
      <h1 className="type-display text-balance">{title}</h1>
      {sentence ? (
        <p className="type-lede text-text-secondary max-w-[48ch]">{sentence}</p>
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
 * A section in the account or the Diwan: a 28 px Light title (the site's
 * section head at the portal's size), an optional text link at the end of
 * the title, then the content. No line explains it; `meta` is data only,
 * such as "5 of 9 done".
 */
export const DiwanSection = ({
  action,
  children,
  className,
  id,
  meta,
  title,
}: {
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly id: string;
  readonly meta?: ReactNode;
  readonly title: ReactNode;
}) => (
  <section
    aria-label={typeof title === "string" ? title : undefined}
    className={cn("grid content-start gap-5", className)}
  >
    <div className="grid gap-2">
      <SectionHead action={action} size="heading" title={title} titleId={id} />
      {meta ? <p className="type-caption">{meta}</p> : null}
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
        "divide-line grid divide-y [&>li]:py-4 [&>li:first-child]:pt-0 [&>li:last-child]:pb-0",
        className
      )}
    >
      {children}
    </List>
  );
};
