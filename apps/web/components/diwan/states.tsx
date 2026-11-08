"use client";

import {
  EmptyLine as BrandEmptyLine,
  ErrorNotice,
} from "@repo/brand/components/sal/states";
import { Spinner } from "@repo/brand/components/ui/spinner";
import { cn } from "@repo/brand/lib/utils";
import { Link as SiteLink } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";
import { useAppLink } from "@/lib/link-context";

export const FullPageSpinner = () => (
  <div className="flex min-h-[50svh] flex-1 items-center justify-center">
    <Spinner className="text-text-secondary size-6" />
  </div>
);

/** A page's content while its gate or data loads, inside the shell. */
export const PageSpinner = () => (
  <div className="flex min-h-[50svh] items-center justify-center">
    <Spinner className="text-text-secondary size-6" />
  </div>
);

export const SectionSpinner = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center justify-center py-8", className)}>
    <Spinner className="text-text-secondary size-5" />
  </div>
);

interface ErrorStateProps {
  readonly className?: string;
  readonly onRetry?: () => void;
}

/** The design system's ErrorNotice, in the page's language. */
export const ErrorState = ({ className, onRetry }: ErrorStateProps) => {
  const t = useTranslations();
  return (
    <ErrorNotice
      className={className}
      message={t("diwan.errors.loadFailed")}
      onRetry={onRetry}
      retryLabel={t("common.retry")}
    />
  );
};

const actionClass = "link type-caption";
// Full URLs and same-page anchors are plain links; paths get the language.
const EXTERNAL = /^(https?|webcal):|^#/u;

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
 * The design system's EmptyLine with its next action: every empty state
 * offers one (an in-app path or a full URL).
 */
export const EmptyLine = ({
  action,
  children,
}: {
  readonly action?: Action;
  readonly children: string;
}) => (
  <BrandEmptyLine action={action ? <ActionLink {...action} /> : undefined}>
    {children}
  </BrandEmptyLine>
);
