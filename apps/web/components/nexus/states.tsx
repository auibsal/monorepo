"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import { cn } from "@repo/design-system/lib/utils";
import { Link as SiteLink } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";
import { useAppLink } from "@/lib/link-context";

export const FullPageSpinner = () => (
  <div className="flex min-h-[50svh] flex-1 items-center justify-center">
    <Spinner className="size-6 text-text-secondary" />
  </div>
);

/** A page's content while its gate or data loads, inside the shell. */
export const PageSpinner = () => (
  <div className="flex min-h-[50svh] items-center justify-center">
    <Spinner className="size-6 text-text-secondary" />
  </div>
);

export const SectionSpinner = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center justify-center py-8", className)}>
    <Spinner className="size-5 text-text-secondary" />
  </div>
);

interface ErrorStateProps {
  readonly className?: string;
  readonly onRetry?: () => void;
}

export const ErrorState = ({ className, onRetry }: ErrorStateProps) => {
  const t = useTranslations();

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-8 text-center",
        className
      )}
      role="alert"
    >
      <p className="type-body text-text-secondary">
        {t("nexus.errors.loadFailed")}
      </p>
      {onRetry ? (
        <Button onClick={onRetry} size="sm" variant="outline">
          {t("common.retry")}
        </Button>
      ) : null}
    </div>
  );
};

const actionClass = "link type-caption";
// Full URLs and same-page anchors are plain links; paths get the language.
const EXTERNAL = /^(https?|webcal):|^#/;

interface Action {
  readonly href: string;
  readonly label: string;
  /** A page on the site, even inside the Diwan. */
  readonly site?: boolean;
}

const ActionLink = ({ href, label, site = false }: Action) => {
  const AppLink = useAppLink();
  const Link = site ? SiteLink : AppLink;
  return EXTERNAL.test(href) ? (
    <a className={actionClass} href={href}>
      {label}
    </a>
  ) : (
    <Link className={actionClass} href={href}>
      {label}
    </Link>
  );
};

/**
 * One muted line for an empty section, with the next thing to do: every
 * empty state offers one (an in-app path or a full URL).
 */
export const EmptyLine = ({
  action,
  children,
}: {
  readonly action?: Action;
  readonly children: string;
}) => (
  <div className="grid justify-items-start gap-2">
    <p className="type-body text-text-secondary">{children}</p>
    {action ? <ActionLink {...action} /> : null}
  </div>
);
