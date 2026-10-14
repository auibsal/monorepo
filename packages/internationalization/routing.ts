import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales } from "./config";

/**
 * The default language (English) has no prefix (/events); every other
 * language does (/ar/events). Owner's decision, Oct 14, 2026.
 */
export const routing = defineRouting({
  defaultLocale,
  localePrefix: "as-needed",
  locales,
});
