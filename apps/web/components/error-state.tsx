"use client";

import { PageError } from "@repo/brand/components/sal/states";
import { Link } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

/**
 * A page that failed (audit A8): the design system's PageError in the
 * page's own language, its error kept in the browser's console.
 */
export const ErrorState = ({
  error,
  home = "/",
  reset,
}: {
  error: Error & { digest?: string };
  home?: string;
  reset: () => void;
}) => {
  const t = useTranslations("common");
  useEffect(() => {
    // The Vercel runtime log keeps server errors; this one is the browser's.
    console.error(error);
  }, [error]);
  return (
    <PageError
      description={t("errorDescription")}
      home={
        <Link className="link self-center" href={home}>
          {t("home")}
        </Link>
      }
      onRetry={() => reset()}
      retryLabel={t("retry")}
      title={t("error")}
    />
  );
};
