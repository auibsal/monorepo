// The site's own consent banner keeps the visitor's answers in its own
// first-party cookie (SITE_CONSENT_COOKIE) and passes on to Cloudflare Zaraz
// every answer Zaraz will store, so Zaraz's tools follow them too. The boot
// script (boot.ts) reads the same cookie for Google consent mode.
//
// Why not Zaraz alone: Zaraz lists every purpose in `zaraz.consent.purposes`
// but stores only some of them (in practice those with a Zaraz tool assigned;
// Advertising has none, as AdSense is not a Zaraz tool). `set()` throws
// "Unknown purpose id" on the others and then saves nothing at all.

interface ZarazConsentApi {
  get: (purpose: string) => boolean | undefined;
  /** The answers Zaraz stores, by purpose ID. */
  getAll?: () => Record<string, boolean>;
  modal: boolean;
  /** The purposes set up in Zaraz, by ID (stored or not). */
  purposes?: Record<string, unknown>;
  sendQueuedEvents?: () => void;
  set: (choices: Record<string, boolean>) => void;
}

declare global {
  interface Window {
    zaraz?: { consent?: Partial<ZarazConsentApi> };
  }
}

/** The site's record of the visitor's answers: {"<purpose id>": true|false}. */
export const SITE_CONSENT_COOKIE = "sal_consent";

/** The footer's "Cookie settings" asks the banner to open with this event. */
export const OPEN_CONSENT = "sal:consent-open";

/** Sent after the banner saves, so the boot script updates Google at once. */
export const CONSENT_SAVED = "sal:consent-saved";

/** Zaraz's Consent API, or null when Zaraz or its consent setting is off. */
export const zarazConsent = (): ZarazConsentApi | null => {
  const consent = typeof window === "undefined" ? null : window.zaraz?.consent;
  return typeof consent?.set === "function" && typeof consent.get === "function"
    ? (consent as ZarazConsentApi)
    : null;
};

const parseChoices = (value: string): Record<string, unknown> | null => {
  if (!(value.startsWith("{") || value.startsWith("%7B"))) {
    return null;
  }
  try {
    const choices: unknown = JSON.parse(decodeURIComponent(value));
    return typeof choices === "object" && choices !== null
      ? (choices as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const cookieValues = (cookies: string) =>
  cookies.split(";").map((pair) => {
    const at = pair.indexOf("=");
    return {
      name: pair.slice(0, at).trim(),
      value: pair.slice(at + 1).trim(),
    };
  });

/** The answers in the site's own consent cookie. */
export const siteChoices = (cookies: string): Record<string, boolean> => {
  const stored = cookieValues(cookies).find(
    (c) => c.name === SITE_CONSENT_COOKIE
  );
  const choices = stored ? parseChoices(stored.value) : null;
  return Object.fromEntries(
    Object.entries(choices ?? {}).filter(
      (entry): entry is [string, boolean] => typeof entry[1] === "boolean"
    )
  );
};

/**
 * Whether the visitor has already answered for this purpose: in the site's
 * cookie, or in Zaraz's consent cookie (whatever name it was given in Zaraz)
 * for answers saved before the site kept its own.
 */
export const hasChoice = (cookies: string, purpose: string) =>
  cookieValues(cookies).some(
    ({ value }) => typeof parseChoices(value)?.[purpose] === "boolean"
  );

/** The visitor's answer for a purpose: the site's cookie first, then Zaraz. */
export const currentChoice = (
  api: ZarazConsentApi | null,
  cookies: string,
  purpose: string
) => {
  const site = siteChoices(cookies)[purpose];
  if (site !== undefined) {
    return site;
  }
  try {
    return api?.get(purpose) === true;
  } catch {
    return false;
  }
};

/** The purpose IDs Zaraz will store (it throws on the others). */
export const zarazStores = (api: ZarazConsentApi, ids: readonly string[]) => {
  const stored = (() => {
    try {
      return api.getAll?.();
    } catch {
      // No stored answers to go by; fall back to the purposes list.
      return null;
    }
  })();
  const known = stored ?? api.purposes;
  return known ? ids.filter((id) => id in known) : [...ids];
};

const YEAR = 60 * 60 * 24 * 365;

/** The Set-Cookie text for the site's consent cookie (one year, this site). */
export const siteConsentCookie = (
  choices: Record<string, boolean>,
  secure: boolean
) =>
  `${SITE_CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(choices))}; Path=/; Max-Age=${YEAR}; SameSite=Lax${secure ? "; Secure" : ""}`;

/**
 * Saves the visitor's answers: all of them in the site's cookie (merged with
 * earlier ones), and each one Zaraz stores in Zaraz, one at a time, so a
 * purpose Zaraz refuses never blocks the others.
 */
export const saveChoice = (
  api: ZarazConsentApi | null,
  choices: Record<string, boolean>,
  cookies: { read: () => string; write: (cookie: string) => void }
) => {
  const merged = { ...siteChoices(cookies.read()), ...choices };
  cookies.write(
    siteConsentCookie(
      merged,
      typeof location === "undefined" || location.protocol === "https:"
    )
  );
  if (api) {
    for (const id of zarazStores(api, Object.keys(choices))) {
      try {
        api.set({ [id]: choices[id] === true });
      } catch {
        // Zaraz refused this purpose; the site's cookie still has it.
      }
    }
    if (Object.values(choices).some(Boolean)) {
      api.sendQueuedEvents?.();
    }
  }
  return merged;
};
