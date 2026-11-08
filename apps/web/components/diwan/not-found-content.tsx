"use client";

import { Button } from "@repo/brand/components/ui/button";
import {
  defaultLocale,
  diwanPath,
  getDirection,
  isLocale,
  localizedPath,
} from "@repo/internationalization/config";
import ar from "@repo/internationalization/messages/ar.json";
import en from "@repo/internationalization/messages/en.json";
import Link from "next/link";
import { usePathname } from "next/navigation";

const texts = { ar: ar.common, ckb: ar.common, en: en.common };

/** The Diwan 404, in the language of the path ("/ar/…"), English otherwise. */
export const NotFoundContent = () => {
  const [, segment] = usePathname().split("/");
  const locale = isLocale(segment) ? segment : defaultLocale;
  const t = texts[locale].notFound;

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center"
      dir={getDirection(locale)}
      lang={locale}
    >
      <title>{t.title}</title>
      <h1 className="type-title">{t.title}</h1>
      <p className="text-text-secondary max-w-md">{t.description}</p>
      <Button asChild>
        <Link href={localizedPath(locale, diwanPath())}>{t.home}</Link>
      </Button>
    </div>
  );
};
