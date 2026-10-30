import { Icon } from "@repo/design-system/components/sal/icon";
import { cn } from "@repo/design-system/lib/utils";
import type { ReactNode } from "react";

const icons = { done: "check", error: "circle-alert", note: "info" } as const;

/**
 * What just happened, in the place the action was: done (the check), an
 * error that says what to do (the alert), or a note. Never a service's raw
 * message (brand book, Words).
 */
export const ResultLine = ({
  children,
  className,
  kind,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly kind: keyof typeof icons;
}) => (
  <p
    className={cn(
      "type-body flex items-start gap-2",
      kind === "note" ? "text-text-secondary" : "text-text",
      className
    )}
    role={kind === "error" ? "alert" : "status"}
  >
    <Icon className="mt-[0.2em]" name={icons[kind]} />
    <span>{children}</span>
  </p>
);
