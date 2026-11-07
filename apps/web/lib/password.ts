import { apiPath } from "@repo/internationalization";

/**
 * Whether a password appears in a known breach (NIST SP 800-63B §5.1.1.2),
 * by k-anonymity: only the first five characters of its SHA-1 leave the
 * browser, to the site's /api/password-check, which asks Have I Been
 * Pwned's range API; the rest is compared here. Unknown (the check could
 * not be made) is false: the check never blocks a sign-up on its own
 * failure.
 */
export const isBreachedPassword = async (password: string) => {
  try {
    const digest = await crypto.subtle.digest(
      "SHA-1",
      new TextEncoder().encode(password)
    );
    const hex = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0")
    )
      .join("")
      .toUpperCase();
    const response = await fetch(
      apiPath(`/password-check?prefix=${hex.slice(0, 5)}`)
    );
    if (!response.ok) {
      return false;
    }
    return breachedIn(await response.text(), hex.slice(5));
  } catch {
    return false;
  }
};

/** Whether a range response ("SUFFIX:COUNT" lines) lists this suffix. */
export const breachedIn = (range: string, suffix: string) =>
  range.split("\n").some((line) => {
    const [candidate, count] = line.trim().split(":");
    return candidate === suffix && Number(count) > 0;
  });
