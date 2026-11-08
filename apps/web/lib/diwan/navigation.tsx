import { project } from "@repo/config";
import { diwanPath, isLocale, localizedPath } from "@repo/internationalization";
import {
  Link as LocaleLink,
  usePathname as useLocalePathname,
  useRouter as useLocaleRouter,
} from "@repo/internationalization/navigation";
import { type ComponentProps, useMemo } from "react";

const PREFIX = project.paths.diwan;
// Absolute URLs, other schemes, fragments and queries are left alone.
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\?)/i;

type LinkProps = ComponentProps<typeof LocaleLink>;
type Href = LinkProps["href"];

/**
 * The Diwan lives under /diwan, but its code names pages by their own path
 * ("/events"). This adds the prefix once, for strings and for
 * `{ pathname, query }` objects, and never twice.
 */
export const diwanHref = <T extends Href>(href: T): T => {
  if (typeof href === "string") {
    if (
      EXTERNAL.test(href) ||
      href === PREFIX ||
      href.startsWith(`${PREFIX}/`)
    ) {
      return href;
    }
    return diwanPath(href) as T;
  }
  if (
    href &&
    typeof href === "object" &&
    "pathname" in href &&
    typeof href.pathname === "string"
  ) {
    return { ...href, pathname: diwanHref(href.pathname) } as T;
  }
  return href;
};

/** "/diwan/events" → "/events": the path as the Diwan code names it. */
export const stripDiwan = (pathname: string) => {
  if (pathname === PREFIX) {
    return "/";
  }
  return pathname.startsWith(`${PREFIX}/`)
    ? pathname.slice(PREFIX.length)
    : pathname;
};

/** The locale-aware Link, with the Diwan prefix added to in-app paths. */
export const Link = ({ href, ...props }: LinkProps) => (
  <LocaleLink {...props} href={diwanHref(href)} />
);

/** The current path inside the Diwan, without language or prefix. */
export const usePathname = () => stripDiwan(useLocalePathname());

type LocaleRouter = ReturnType<typeof useLocaleRouter>;

/** The locale-aware router, with the Diwan prefix added to in-app paths. */
export const useRouter = (): LocaleRouter => {
  const router = useLocaleRouter();
  return useMemo(
    () => ({
      ...router,
      prefetch: ((href, options) =>
        router.prefetch(diwanHref(href), options)) as LocaleRouter["prefetch"],
      push: ((href, options) =>
        router.push(diwanHref(href), options)) as LocaleRouter["push"],
      replace: ((href, options) =>
        router.replace(diwanHref(href), options)) as LocaleRouter["replace"],
    }),
    [router]
  );
};

/**
 * A post-sign-in destination taken from the URL. Only paths on this site
 * are accepted, never absolute or protocol-relative URLs (open redirects).
 */
export const safeNextPath = (value: string | null | undefined) =>
  value?.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")
    ? value
    : null;

/** "/en/events?x" → "/events?x", for the locale-aware router. */
export const stripLocale = (path: string) => {
  const [, first, ...rest] = path.split("/");
  return isLocale(first) ? `/${rest.join("/")}` : path;
};

/** Where confirmation and magic links land, carrying the return path. */
export const callbackUrl = (locale: string, next: string | null) => {
  const url = new URL(
    localizedPath(locale, diwanPath("/auth/callback")),
    window.location.origin
  );
  if (next) {
    url.searchParams.set("next", next);
  }
  return url.toString();
};

/**
 * A return address on the Society's own site after sign-in (the ?to= of
 * /diwan/continue). Only https URLs on the Society's domain are accepted, so
 * the Diwan never sends anyone elsewhere.
 */
export const safeSocietyUrl = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value);
    const host = url.hostname;
    return url.protocol === "https:" &&
      (host === project.domain || host.endsWith(`.${project.domain}`))
      ? url.toString()
      : null;
  } catch {
    return null;
  }
};
