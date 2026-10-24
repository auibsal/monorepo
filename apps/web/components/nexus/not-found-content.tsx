"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  defaultLocale,
  getDirection,
  isLocale,
  localizedPath,
  nexusPath,
} from "@repo/internationalization/config";
import ar from "@repo/internationalization/messages/ar.json";
import en from "@repo/internationalization/messages/en.json";
import Link from "next/link";
import { usePathname } from "next/navigation";

const texts = { ar: ar.common, ckb: ar.common, en: en.common };

/** The Nexus 404, in the language of the path ("/ar/…"), English otherwise. */
export const NotFoundContent = () => {
  const [, segment] = usePathname().split("/");
  const locale = isLocale(segment) ? segment : defaultLocale;
  const t = texts[locale].notFound;

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center"
      dir={getDirection(locale)}
      lang={locale}
    >
      <h1 className="font-semibold text-2xl">{t.title}</h1>
      <p className="max-w-md text-muted-foreground">{t.description}</p>
      <Button asChild>
        <Link href={localizedPath(locale, nexusPath())}>{t.home}</Link>
      </Button>
    </div>
  );
};
