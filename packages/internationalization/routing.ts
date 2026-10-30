import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales } from "./config";

/**
 * The default language (English) has no prefix (/events); every other
 * language does (/ar/events). Owner's decision, Oct 14, 2026.
 *
 * The address alone decides the language (the overhaul, Oct 30, 2026): an
 * English link opens in English even for someone who visited the Arabic
 * site before, and the switch in the header moves between the two.
 */
export const routing = defineRouting({
  defaultLocale,
  localeDetection: false,
  localePrefix: "as-needed",
  locales,
});
