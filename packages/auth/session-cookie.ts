// Supabase keeps the session in a cookie named sb-<project>-auth-token
// (split into .0, .1, … when long). The public pages and the Nexus share one
// origin, so the site can tell a signed-in visitor without a request. A check
// for the page, never for access: Row Level Security decides what anyone may
// read.

const SESSION_COOKIE = /^sb-[A-Za-z0-9-]+-auth-token(\.\d+)?$/;

/** Whether the cookies carry a Supabase session. */
export const hasSessionCookie = (cookies: string) =>
  cookies.split(";").some((pair) => {
    const [name = "", ...value] = pair.trim().split("=");
    return SESSION_COOKIE.test(name) && value.join("=").length > 0;
  });
