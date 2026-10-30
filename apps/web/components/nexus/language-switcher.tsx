"use client";

import { Icon } from "@repo/design-system/components/sal/icon";
import { cn } from "@repo/design-system/lib/utils";
import { type Locale, locales } from "@repo/internationalization/config";
import { usePathname, useRouter } from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
import { mastheadLink } from "@/components/masthead";

/**
 * Switches between English and Arabic: the globe and the other language's
 * name. The address carries the language, so the choice holds as you move
 * between pages.
 */
export const LanguageSwitcher = () => {
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const current = useLocale();
  const other = (locales.find((locale) => locale !== current) ??
    current) as Locale;

  return (
    <button
      aria-label={t("switchLanguage")}
      className={cn(mastheadLink, "inline-flex items-center gap-1.5")}
      lang={other}
      onClick={() => {
        router.replace(`${pathname}${window.location.search}`, {
          locale: other,
        });
      }}
      type="button"
    >
      <Icon name="globe" />
      {t("otherLanguage")}
    </button>
  );
};
