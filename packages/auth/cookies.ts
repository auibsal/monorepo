import type { CookieOptionsWithName } from "@supabase/ssr";
import { keys } from "./keys";

/**
 * Session cookie settings. The one site needs no cookie domain. Production
 * keeps NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=".auibsal.org" from the time the
 * Nexus had its own host: the members' existing sessions carry that domain,
 * and a host-only cookie of the same name beside it would leave them with
 * two sessions. Leave it set there; new setups leave it empty.
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
