"use client";

import { Button } from "@repo/brand/components/ui/button";
import { fonts } from "@repo/brand/lib/fonts";
import { getDirection } from "@repo/internationalization/config";
import type NextError from "next/error";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import "./[locale]/styles.css";

interface GlobalErrorProperties {
  readonly error: NextError & { digest?: string };
  readonly reset: () => void;
}

type Texts =
  typeof import("@repo/internationalization/messages/en.json")["common"];

/**
 * The messages files load only when this page shows: imported at the top,
 * both whole files would ride in every page's JavaScript, since this
 * component ships with all of them.
 */
const loadTexts = async (locale: "ar" | "en"): Promise<Texts> =>
  locale === "ar"
    ? (await import("@repo/internationalization/messages/ar.json")).default
        .common
    : (await import("@repo/internationalization/messages/en.json")).default
        .common;

/**
 * Replaces the root layout, so it reads the language from the URL itself:
 * Arabic pages start with /ar; every other address is English, the
 * default (English has no prefix).
 */
const GlobalError = ({ error, reset }: GlobalErrorProperties) => {
  const [, segment] = usePathname().split("/");
  const locale: "ar" | "en" = segment === "ar" ? "ar" : "en";
  const [t, setT] = useState<Texts | null>(null);

  useEffect(() => {
    loadTexts(locale).then(setT, () => setT(null));
  }, [locale]);

  useEffect(() => {
    // The Vercel runtime log keeps server errors; this one is the browser's.
    console.error(error);
  }, [error]);

  return (
    <html className={fonts} dir={getDirection(locale)} lang={locale}>
      <body className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        {t ? (
          <>
            <h1 className="text-2xl font-light">{t.error}</h1>
            <p className="text-text-secondary">{t.errorDescription}</p>
            <Button onClick={() => reset()}>{t.retry}</Button>
          </>
        ) : null}
      </body>
    </html>
  );
};

export default GlobalError;
