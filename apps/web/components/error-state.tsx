"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Link } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

/**
 * A page that failed, in the brand's plain state (audit A8): what happened,
 * a try-again button and the way home, in the page's own language.
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
    <div className="mx-auto flex min-h-[60vh] max-w-6xl flex-col items-start justify-center gap-4 px-4 py-20">
      <h1 className="type-display">{t("error")}</h1>
      <p className="type-lede max-w-xl">{t("errorDescription")}</p>
      <div className="flex flex-wrap gap-3 pt-2">
        <Button onClick={() => reset()} type="button">
          {t("retry")}
        </Button>
        <Link className="link self-center" href={home}>
          {t("home")}
        </Link>
      </div>
    </div>
  );
};
