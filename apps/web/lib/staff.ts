// Which ways the signed-in person has beyond the public site, remembered in
// this browser's local storage (never a cookie: the Privacy Notice lists
// only the cookies the site needs) so the public pages, which have no
// session client, can show them in the header: Your account for everyone,
// the Diwan for staff, and the dashboard for a partner's people. A hint for
// the header, never for access: each area's own gate and Row Level Security
// decide.

const WAYS_KEY = "sal_ways";

export interface Ways {
  /** Holds a role in the Society (the Diwan). */
  readonly diwan: boolean;
  /** On a partner's team: the partner's dashboard. */
  readonly partner: boolean;
}

const FLAGS = ["diwan", "partner"] as const;

/** What this browser remembers, or null when nothing is remembered yet. */
export const readWays = (): Ways | null => {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(WAYS_KEY);
  } catch {
    return null;
  }
  if (stored === null) {
    return null;
  }
  const held = new Set(stored.split("."));
  return { diwan: held.has("diwan"), partner: held.has("partner") };
};

/** Remembers the ways (null forgets them, on signing out). */
export const rememberWays = (ways: Ways | null) => {
  try {
    if (ways) {
      window.localStorage.setItem(
        WAYS_KEY,
        FLAGS.filter((flag) => ways[flag]).join(".") || "none"
      );
    } else {
      window.localStorage.removeItem(WAYS_KEY);
    }
  } catch {
    // Private windows may refuse storage; the header then shows less.
  }
};
