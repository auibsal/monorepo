/**
 * locales
 *
 * @description Standardized execution for locales.
 */
export const locales = ['en', 'ar'] as const;

/**
 * Locale
 *
 * @description Standardized execution for Locale.
 */
export type Locale = (typeof locales)[number];

/**
 * defaultLocale
 *
 * @description Standardized execution for defaultLocale.
 */
export const defaultLocale: Locale = 'en';

/**
 * isLocale
 *
 * @description Standardized execution for isLocale.
 */
export function isLocale(locale: unknown): locale is Locale {
  return typeof locale === 'string' && locales.includes(locale as Locale);
}
