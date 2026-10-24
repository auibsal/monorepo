import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface SectionHeadProps {
  /** An optional text link at the end, e.g. "All events". */
  readonly action?: ReactNode;
  readonly className?: string;
  /** The heading level; sections on a page are h2. */
  readonly level?: "h2" | "h3";
  /** "title" (44 px) on the public pages; "heading" (28 px) in the account and the Diwan. */
  readonly size?: "heading" | "title";
  readonly title: ReactNode;
  readonly titleId?: string;
}

/**
 * A section title: the title alone, Light (Ubuntu Arabic Regular in
 * Arabic), and at most a text link at the end of its line. No marker and
 * nothing above it: the Bookmark is only ever the logo.
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
      "flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2",
      className
    )}
  >
    <Heading
      className={cn(
        size === "title" ? "type-title" : "type-heading font-light",
        "m-0"
      )}
      id={titleId}
    >
      {title}
    </Heading>
    {action ? <div>{action}</div> : null}
  </div>
);
