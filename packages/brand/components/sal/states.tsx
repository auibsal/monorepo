"use client";

import { Button } from "@repo/brand/components/ui/button";
import { cn } from "@repo/brand/lib/utils";
import type { ReactNode } from "react";

/**
 * A section that could not load: one muted line and, when it can be
 * tried again, a quiet button. The words come in the page's language.
 */
export const ErrorNotice = ({
  className,
  message,
  onRetry,
  retryLabel,
}: {
  readonly className?: string;
  readonly message: string;
  readonly onRetry?: () => void;
  readonly retryLabel: string;
}) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-3 py-8 text-center",
      className
    )}
    role="alert"
  >
    <p className="type-body text-text-secondary">{message}</p>
    {onRetry ? (
      <Button onClick={onRetry} size="sm" variant="outline">
        {retryLabel}
      </Button>
    ) : null}
  </div>
);

/**
 * One muted line for an empty section, with the next thing to do: every
 * empty state offers one (the action, a text link).
 */
export const EmptyLine = ({
  action,
  children,
}: {
  readonly action?: ReactNode;
  readonly children: string;
}) => (
  <div className="grid justify-items-start gap-2">
    <p className="type-body text-text-secondary">{children}</p>
    {action}
  </div>
);

/**
 * A page that failed, in the brand's plain state: what happened, the one
 * solid button to try again and the way home as a text link.
 */
export const PageError = ({
  description,
  home,
  onRetry,
  retryLabel,
  title,
}: {
  readonly description: string;
  readonly home: ReactNode;
  readonly onRetry: () => void;
  readonly retryLabel: string;
  readonly title: string;
}) => (
  <div className="mx-auto flex min-h-[60vh] max-w-6xl flex-col items-start justify-center gap-4 px-4 py-20">
    <h1 className="type-display">{title}</h1>
    <p className="type-lede max-w-xl">{description}</p>
    <div className="flex flex-wrap gap-3 pt-2">
      <Button onClick={onRetry} type="button">
        {retryLabel}
      </Button>
      {home}
    </div>
  </div>
);
