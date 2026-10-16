import { describe, expect, test, vi } from "vitest";
import {
  currentChoice,
  hasChoice,
  SITE_CONSENT_COOKIE,
  saveChoice,
  siteChoices,
  zarazStores,
} from "./consent";

/** A cookie jar: what saveChoice writes, read back like document.cookie. */
const jar = (initial = "") => {
  let site = initial;
  return {
    read: () => site,
    write: (cookie: string) => {
      site = cookie.split(";")[0] ?? "";
    },
  };
};

/** A Zaraz that, like the real one, stores only some of its purposes. */
const zaraz = (stores: string[]) => {
  const saved: Record<string, boolean> = {};
  return {
    get: (id: string) => saved[id],
    getAll: () =>
      Object.fromEntries(stores.map((id) => [id, saved[id] ?? false])),
    modal: false,
    purposes: { aDs: {}, aNaL: {} },
    saved,
    sendQueuedEvents: vi.fn(),
    set: vi.fn((choices: Record<string, boolean>) => {
      for (const id of Object.keys(choices)) {
        if (!stores.includes(id)) {
          throw new Error(`Unknown purpose id: ${id}`);
        }
      }
      Object.assign(saved, choices);
    }),
  };
};

describe("has the visitor answered", () => {
  test("not before anything is stored", () => {
    expect(hasChoice("", "aNaL")).toBe(false);
    expect(hasChoice("NEXT_LOCALE=en; cf_clearance=abc", "aNaL")).toBe(false);
  });

  test("yes, from the site's cookie or Zaraz's, allowed or declined", () => {
    expect(hasChoice('zaraz-consent={"aNaL":false}', "aNaL")).toBe(true);
    expect(
      hasChoice(
        `${SITE_CONSENT_COOKIE}=${encodeURIComponent('{"aDs":true}')}`,
        "aDs"
      )
    ).toBe(true);
  });

  test("ignores other purposes and broken values", () => {
    expect(hasChoice('zaraz-consent={"other":true}', "aNaL")).toBe(false);
    expect(hasChoice("zaraz-consent={not json", "aNaL")).toBe(false);
  });
});

describe("saving the answers", () => {
  test("keeps every answer, even the ones Zaraz refuses", () => {
    const cookies = jar();
    const api = zaraz(["aNaL"]);
    saveChoice(api, { aDs: true, aNaL: true }, cookies);
    expect(siteChoices(cookies.read())).toEqual({ aDs: true, aNaL: true });
    expect(api.saved).toEqual({ aNaL: true });
    expect(api.sendQueuedEvents).toHaveBeenCalledOnce();
  });

  test("a refused purpose never stops the others", () => {
    const cookies = jar();
    const api = zaraz(["aNaL"]);
    api.getAll = undefined as never;
    saveChoice(api, { aDs: false, aNaL: true }, cookies);
    expect(api.saved).toEqual({ aNaL: true });
  });

  test("a later answer for one purpose keeps the other", () => {
    const cookies = jar();
    saveChoice(null, { aDs: true, aNaL: true }, cookies);
    saveChoice(null, { aNaL: false }, cookies);
    expect(siteChoices(cookies.read())).toEqual({ aDs: true, aNaL: false });
  });

  test("Zaraz stores only the purposes it lists in getAll", () => {
    expect(zarazStores(zaraz(["aNaL"]), ["aNaL", "aDs"])).toEqual(["aNaL"]);
  });
});

describe("the visitor's answer", () => {
  test("the site's cookie first, then Zaraz, else declined", () => {
    const api = zaraz(["aNaL"]);
    api.saved.aNaL = true;
    const site = `${SITE_CONSENT_COOKIE}=${encodeURIComponent('{"aDs":true}')}`;
    expect(currentChoice(api, site, "aDs")).toBe(true);
    expect(currentChoice(api, site, "aNaL")).toBe(true);
    expect(currentChoice(null, "", "aNaL")).toBe(false);
  });
});
