// The site asks for consent itself (apps/web's consent card) and keeps the
// answers in its own first-party cookie. The boot script (boot.ts) reads the
// same cookie for Google consent mode. No third-party consent tool is
// involved: an earlier setup through Cloudflare Zaraz lost answers (Zaraz
// stores only purposes that have a Zaraz tool, and rejects a whole save that
// names another), so the site keeps the record on its own.

/** What the site asks about. */
export const consentPurposes = ["analytics", "ads"] as const;
export type ConsentPurpose = (typeof consentPurposes)[number];

/** The site's record of the visitor's answers: {"analytics": true, …}. */
export const SITE_CONSENT_COOKIE = "sal_consent";

/** The footer's "Cookie settings" asks the card to open with this event. */
export const OPEN_CONSENT = "sal:consent-open";

/** Sent after the card saves, so the boot script updates Google at once. */
export const CONSENT_SAVED = "sal:consent-saved";

const cookieValues = (cookies: string) =>
  cookies.split(";").map((pair) => {
    const at = pair.indexOf("=");
    return {
      name: pair.slice(0, at).trim(),
      value: pair.slice(at + 1).trim(),
    };
  });

/** The answers in the site's consent cookie. */
export const siteChoices = (
  cookies: string
): Partial<Record<ConsentPurpose, boolean>> => {
  const stored = cookieValues(cookies).find(
    (c) => c.name === SITE_CONSENT_COOKIE
  );
  if (!stored) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(stored.value));
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }
    const record = parsed as Record<string, unknown>;
    return Object.fromEntries(
      consentPurposes
        .filter((p) => typeof record[p] === "boolean")
        .map((p) => [p, record[p] as boolean])
    );
  } catch {
    return {};
  }
};

/** Whether the visitor has answered for this purpose (allowed or declined). */
export const hasChoice = (cookies: string, purpose: ConsentPurpose) =>
  siteChoices(cookies)[purpose] !== undefined;

const YEAR = 60 * 60 * 24 * 365;

/** The Set-Cookie text for the site's consent cookie (one year, this site). */
export const siteConsentCookie = (
  choices: Partial<Record<ConsentPurpose, boolean>>,
  secure: boolean
) =>
  `${SITE_CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(choices))}; Path=/; Max-Age=${YEAR}; SameSite=Lax${secure ? "; Secure" : ""}`;

/** Saves the visitor's answers, merged with earlier ones. */
export const saveChoice = (
  choices: Partial<Record<ConsentPurpose, boolean>>,
  cookies: { read: () => string; write: (cookie: string) => void },
  secure = typeof location === "undefined" || location.protocol === "https:"
) => {
  const merged = { ...siteChoices(cookies.read()), ...choices };
  cookies.write(siteConsentCookie(merged, secure));
  return merged;
};
