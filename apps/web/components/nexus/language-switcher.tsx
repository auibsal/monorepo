"use client";

import { type Locale, locales } from "@repo/internationalization/config";
import { usePathname, useRouter } from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
import { mastheadLink } from "@/components/masthead";

/**
 * Switches between English and Arabic, in words (the brand prefers words
 * to icons). The proxy remembers the choice in a cookie.
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
      className={mastheadLink}
      lang={other}
      onClick={() => {
        router.replace(`${pathname}${window.location.search}`, {
          locale: other,
        });
      }}
      type="button"
    >
      {t("otherLanguage")}
    </button>
  );
};
