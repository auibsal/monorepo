import { describe, expect, test } from "vitest";
import {
  hasChoice,
  SITE_CONSENT_COOKIE,
  saveChoice,
  siteChoices,
  siteConsentCookie,
} from "./consent";

/** A cookie jar: what saveChoice writes, read back like document.cookie. */
const jar = (initial = "") => {
  let site = initial;
  return {
    read: () => site,
    write: (text: string) => {
      site = text.split(";")[0] ?? "";
    },
  };
};

const cookie = (value: unknown) =>
  `${SITE_CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(value))}`;

describe("has the visitor answered", () => {
  test("not before anything is stored", () => {
    expect(hasChoice("", "analytics")).toBe(false);
    expect(hasChoice("NEXT_LOCALE=en; cf_clearance=abc", "analytics")).toBe(
      false
    );
  });

  test("yes, allowed or declined, for each purpose on its own", () => {
    const cookies = `NEXT_LOCALE=ar; ${cookie({ analytics: false })}`;
    expect(hasChoice(cookies, "analytics")).toBe(true);
    expect(hasChoice(cookies, "ads")).toBe(false);
  });

  test("ignores other cookies, unknown keys and broken values", () => {
    expect(siteChoices('zaraz-consent={"analytics":true}')).toEqual({});
    expect(siteChoices(cookie({ analytics: "yes", nOag: true }))).toEqual({});
    expect(siteChoices(`${SITE_CONSENT_COOKIE}=%7Bnot`)).toEqual({});
  });
});

describe("saving the answers", () => {
  test("keeps both answers, and a later answer for one keeps the other", () => {
    const cookies = jar();
    saveChoice({ ads: true, analytics: true }, cookies, true);
    saveChoice({ analytics: false }, cookies, true);
    expect(siteChoices(cookies.read())).toEqual({
      ads: true,
      analytics: false,
    });
  });

  test("a year, this site only, Secure on https", () => {
    const text = siteConsentCookie({ ads: false }, true);
    expect(text).toContain("Max-Age=31536000");
    expect(text).toContain("SameSite=Lax");
    expect(text).toContain("Secure");
    expect(text).not.toContain("Domain=");
    expect(siteConsentCookie({}, false)).not.toContain("Secure");
  });
});
