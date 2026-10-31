// Which ways the signed-in person has beyond the public site, remembered in
// a cookie so the public pages (which have no session client) can show
// them in the header: Membership for everyone (owner, Oct 31, 2026), the
// Diwan for staff, and the dashboard for a partner's people. A hint for the header, never for access: each area's own
// gate and Row Level Security decide.

export const WAYS_COOKIE = "sal_ways";

export interface Ways {
  /** Holds a role in the Society (the Diwan). */
  readonly diwan: boolean;
  /** On a partner's team: the partner's dashboard. */
  readonly partner: boolean;
}

const FLAGS = ["diwan", "partner"] as const;

/** What the cookies say, or null when nothing is remembered yet. */
export const readWays = (cookies: string): Ways | null => {
  const pair = cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${WAYS_COOKIE}=`));
  if (!pair) {
    return null;
  }
  const held = new Set(
    decodeURIComponent(pair.slice(WAYS_COOKIE.length + 1)).split(".")
  );
  return {
    diwan: held.has("diwan"),
    partner: held.has("partner"),
  };
};

/** Remembers the ways (null forgets them, on signing out). */
export const rememberWays = (ways: Ways | null) => {
  const value = ways
    ? FLAGS.filter((flag) => ways[flag]).join(".") || "none"
    : "";
  // biome-ignore lint/suspicious/noDocumentCookie: a plain hint cookie, read back by readWays.
  document.cookie = ways
    ? `${WAYS_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`
    : `${WAYS_COOKIE}=; path=/; max-age=0; samesite=lax`;
};
