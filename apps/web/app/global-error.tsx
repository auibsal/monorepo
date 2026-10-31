"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { fonts } from "@repo/design-system/lib/fonts";
import { getDirection, isLocale } from "@repo/internationalization/config";
import ar from "@repo/internationalization/messages/ar.json";
import en from "@repo/internationalization/messages/en.json";
import type NextError from "next/error";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import "./[locale]/styles.css";

interface GlobalErrorProperties {
  readonly error: NextError & { digest?: string };
  readonly reset: () => void;
}

const texts = { ar: ar.common, ckb: ar.common, en: en.common };

/** Replaces the root layout, so it reads the language from the URL itself. */
const GlobalError = ({ error, reset }: GlobalErrorProperties) => {
  const [, segment] = usePathname().split("/");
  const locale = isLocale(segment) ? segment : "ar";
  const t = texts[locale];

  useEffect(() => {
    // The Vercel runtime log keeps server errors; this one is the browser's.
    console.error(error);
  }, [error]);

  return (
    <html className={fonts} dir={getDirection(locale)} lang={locale}>
      <body className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="font-light text-2xl">{t.error}</h1>
        <p className="text-text-secondary">{t.errorDescription}</p>
        <Button onClick={() => reset()}>{t.retry}</Button>
      </body>
    </html>
  );
};

export default GlobalError;
