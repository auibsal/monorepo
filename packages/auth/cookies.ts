import type { CookieOptionsWithName } from "@supabase/ssr";
import { keys } from "./keys";

/**
 * Session cookie settings. The one site needs no cookie domain; setting
 * NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=".auibsal.org" also sends the cookie to
 * subdomains, if the Society ever adds one.
 */
export const authCookieOptions = (): CookieOptionsWithName => {
  const domain = keys().NEXT_PUBLIC_AUTH_COOKIE_DOMAIN;

  return {
    ...(domain ? { domain } : {}),
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
};
