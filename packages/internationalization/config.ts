import { project, type SupportedLocale } from "@repo/config";

export type Direction = "ltr" | "rtl";

interface LocaleDefinition {
  dir: Direction;
  /** Locale used with Intl for dates and numbers. */
  intl: string;
  /** Native name, for language switchers. */
  label: string;
}

/**
 * Every locale the template knows. Which ones are live is set in
 * packages/config/project.json (`locale.enabled`). Sorani Kurdish (ckb) is
 * ready to enable once messages/ckb.json exists.
 */
export const localeDefinitions: Record<SupportedLocale, LocaleDefinition> = {
  ar: { dir: "rtl", intl: "ar-IQ", label: "العربية" },
  ckb: { dir: "rtl", intl: "ckb-IQ", label: "کوردی" },
  // British English: day-month-year dates, as used in Iraq.
  en: { dir: "ltr", intl: "en-US", label: "English" },
};

export const locales = project.locale.enabled;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = project.locale.default;

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (locales as readonly string[]).includes(value);

export const getDirection = (locale: string): Direction =>
  isLocale(locale) ? localeDefinitions[locale].dir : "ltr";

export const getLocaleLabel = (locale: Locale) =>
  localeDefinitions[locale].label;

/**
 * A page's path in a locale. The default language has no prefix
 * (`/events`); every other language does (`/ar/events`).
 */
export const localizedPath = (locale: string, path = "/") => {
  const page = path.startsWith("/") ? path : `/${path}`;
  if (locale === defaultLocale || !isLocale(locale)) {
    return page;
  }
  return page === "/" ? `/${locale}` : `/${locale}${page}`;
};

const withSlash = (path: string) => (path.startsWith("/") ? path : `/${path}`);

/**
 * A Diwan page's path on the one site, before the language is applied:
 * "/events" → "/diwan/events". Use `localizedPath(locale, diwanPath(p))`
 * for a link from the public pages; inside the Diwan, its own navigation
 * module adds the prefix.
 */
export const diwanPath = (path = "/") => {
  const page = withSlash(path);
  return page === "/" ? project.paths.diwan : `${project.paths.diwan}${page}`;
};

/** An API route's path: "/calendar/sal.ics" → "/api/calendar/sal.ics". */
export const apiPath = (path: string) =>
  `${project.paths.api}${withSlash(path)}`;

/** The absolute address of a page in a language, for emails and feeds. */
export const siteUrl = (locale: string, path = "/", origin = project.url) =>
  `${origin}${localizedPath(locale, path)}`;

/** The absolute address of a Diwan page in a language. */
export const diwanUrl = (locale: string, path = "/", origin = project.url) =>
  siteUrl(locale, diwanPath(path), origin);

/** The absolute address of an API route. */
export const apiUrl = (path: string, origin = project.url) =>
  `${origin}${apiPath(path)}`;
