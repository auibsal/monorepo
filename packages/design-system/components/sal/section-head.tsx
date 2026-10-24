import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface SectionHeadProps {
  /** An optional text link at the end, e.g. "All events". */
  readonly action?: ReactNode;
  readonly className?: string;
  /** The heading level; sections on a page are h2. */
  readonly level?: "h2" | "h3";
  /** "title" (44 px) on the public pages; "heading" (28 px) in the Diwan. */
  readonly size?: "heading" | "title";
  readonly title: ReactNode;
  readonly titleId?: string;
}

/**
 * A section title (v6): the Bookmark marker, the title in 44 px Regular and
 * an optional text link at the end of the line. Every section title on the
 * public pages starts this way, in place of boxes and colored kickers.
 */
export const SectionHead = ({
  action,
  className,
  level: Heading = "h2",
  size = "title",
  title,
  titleId,
}: SectionHeadProps) => (
  <div
    className={cn(
      "flex flex-wrap items-center gap-x-[14px] gap-y-2",
      className
    )}
  >
    <span aria-hidden="true" className="bookmark" />
    <Heading
      className={cn(size === "title" ? "type-title" : "type-heading", "m-0")}
      id={titleId}
    >
      {title}
    </Heading>
    {action ? <div className="ms-auto">{action}</div> : null}
  </div>
);
