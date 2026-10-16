// The site's own consent banner talks to Cloudflare Zaraz through its
// Consent API. Zaraz stores the choice and tells the boot script (boot.ts),
// which passes it on to Google consent mode.

interface ZarazConsentApi {
  get: (purpose: string) => boolean | undefined;
  modal: boolean;
  /** The purposes set up (and published) in Zaraz, by ID. */
  purposes?: Record<string, unknown>;
  sendQueuedEvents?: () => void;
  set: (choices: Record<string, boolean>) => void;
}

declare global {
  interface Window {
    zaraz?: { consent?: Partial<ZarazConsentApi> };
  }
}

/** The footer's "Cookie settings" asks the banner to open with this event. */
export const OPEN_CONSENT = "sal:consent-open";

/** Zaraz's Consent API, or null when Zaraz or its consent setting is off. */
export const zarazConsent = (): ZarazConsentApi | null => {
  const consent = typeof window === "undefined" ? null : window.zaraz?.consent;
  return typeof consent?.set === "function" && typeof consent.get === "function"
    ? (consent as ZarazConsentApi)
    : null;
};

/**
 * Whether the visitor has already answered for this purpose. Zaraz answers
 * false both for "declined" and "not asked yet", so look for the choice in
 * its consent cookie, whatever name the cookie was given in Zaraz.
 */
export const hasChoice = (cookies: string, purpose: string) =>
  cookies.split(";").some((pair) => {
    const value = pair.slice(pair.indexOf("=") + 1).trim();
    if (!(value.startsWith("{") || value.startsWith("%7B"))) {
      return false;
    }
    try {
      const choices: unknown = JSON.parse(decodeURIComponent(value));
      return (
        typeof choices === "object" &&
        choices !== null &&
        typeof (choices as Record<string, unknown>)[purpose] === "boolean"
      );
    } catch {
      return false;
    }
  });

/**
 * The purpose IDs Zaraz knows. Zaraz throws on an ID it does not have (one
 * set on the site but not yet added or published in Zaraz) and then saves
 * nothing, so the site asks only about these.
 */
export const knownPurposes = (api: ZarazConsentApi, ids: readonly string[]) =>
  api.purposes ? ids.filter((id) => id in (api.purposes ?? {})) : [...ids];

/**
 * Saves the visitor's answers in Zaraz, which updates Google consent mode.
 * Only purposes Zaraz knows are sent; false when Zaraz refused the answers.
 */
export const saveChoice = (
  api: ZarazConsentApi,
  choices: Record<string, boolean>
) => {
  const known = Object.fromEntries(
    knownPurposes(api, Object.keys(choices)).map((id) => [id, choices[id]])
  ) as Record<string, boolean>;
  if (Object.keys(known).length === 0) {
    return false;
  }
  try {
    api.set(known);
  } catch {
    return false;
  }
  if (Object.values(known).some(Boolean)) {
    api.sendQueuedEvents?.();
  }
  return true;
};
