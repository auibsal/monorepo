import { runInNewContext } from "node:vm";
import { describe, expect, test } from "vitest";
import { bootScript, loaderSrc } from "./boot";

/** Runs the boot script in a fake page; returns what reached dataLayer. */
const run = (
  settings: Parameters<typeof bootScript>[0],
  choices?: Record<string, boolean>
) => {
  const listeners: Record<string, (() => void)[]> = {
    zarazConsentChoicesUpdated: [],
  };
  const state = { choices };
  // The sandbox is the page's window, so globals are window properties.
  const window: Record<string, unknown> = {
    document: {
      addEventListener: (name: string, fn: () => void) => {
        listeners[name] = [...(listeners[name] ?? []), fn];
      },
    },
  };
  window.window = window;
  if (choices) {
    window.zaraz = {
      consent: { get: (id: string) => state.choices?.[id] },
    };
  }
  runInNewContext(bootScript(settings), window);
  const layer = () =>
    (window.dataLayer as unknown[]).map((entry) =>
      typeof entry === "object" && entry !== null && "length" in entry
        ? Array.from(entry as ArrayLike<unknown>)
        : entry
    );
  return {
    change: (next: Record<string, boolean>) => {
      state.choices = next;
      for (const fn of listeners.zarazConsentChoicesUpdated) {
        fn();
      }
    },
    layer,
  };
};

const consentUpdates = (layer: unknown[]) =>
  layer.filter(
    (e) => Array.isArray(e) && e[0] === "consent" && e[1] === "update"
  ) as [string, string, { analytics_storage: string }][];

describe("what loads", () => {
  test("nothing without an ID", () => {
    expect(loaderSrc({})).toBeNull();
  });

  test("GTM from Google, or from the tag gateway on auibsal.org", () => {
    expect(loaderSrc({ gtmId: "GTM-ABC1" })).toBe(
      "https://www.googletagmanager.com/gtm.js?id=GTM-ABC1"
    );
    expect(loaderSrc({ gatewayPath: "/metrics", gtmId: "GTM-ABC1" })).toBe(
      "/metrics/gtm.js?id=GTM-ABC1"
    );
  });

  test("GTM wins over GA4 alone, so GA4 is never loaded twice", () => {
    expect(loaderSrc({ gaId: "G-XYZ", gtmId: "GTM-ABC1" })).toContain("gtm.js");
    expect(loaderSrc({ gaId: "G-XYZ" })).toBe(
      "https://www.googletagmanager.com/gtag/js?id=G-XYZ"
    );
  });
});

describe("consent", () => {
  test("everything starts denied", () => {
    const { layer } = run({ gtmId: "GTM-ABC1" });
    const [first] = layer() as [string, string, Record<string, string>][];
    expect(first?.slice(0, 2)).toEqual(["consent", "default"]);
    expect(first?.[2]).toMatchObject({
      ad_personalization: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      analytics_storage: "denied",
    });
  });

  test("analytics is granted only when the Zaraz purpose is accepted", () => {
    const yes = run(
      { gtmId: "GTM-ABC1", zarazPurpose: "aNaL" },
      { aNaL: true }
    );
    expect(consentUpdates(yes.layer()).at(-1)?.[2].analytics_storage).toBe(
      "granted"
    );
    const no = run(
      { gtmId: "GTM-ABC1", zarazPurpose: "aNaL" },
      { aNaL: false }
    );
    expect(consentUpdates(no.layer()).at(-1)?.[2].analytics_storage).toBe(
      "denied"
    );
  });

  test("follows the visitor when they change their mind", () => {
    const page = run(
      { gtmId: "GTM-ABC1", zarazPurpose: "aNaL" },
      { aNaL: true }
    );
    page.change({ aNaL: false });
    expect(consentUpdates(page.layer()).at(-1)?.[2].analytics_storage).toBe(
      "denied"
    );
  });

  test("never grants anything without Zaraz or a purpose", () => {
    expect(consentUpdates(run({ gtmId: "GTM-ABC1" }).layer())).toEqual([]);
    expect(
      consentUpdates(run({ gtmId: "GTM-ABC1" }, { aNaL: true }).layer())
    ).toEqual([]);
  });

  test("advertising signals are never granted", () => {
    const page = run(
      { gtmId: "GTM-ABC1", zarazPurpose: "aNaL" },
      { aNaL: true }
    );
    for (const [, , update] of consentUpdates(page.layer())) {
      expect(Object.keys(update)).toEqual(["analytics_storage"]);
    }
  });

  test("a value cannot break out of the script", () => {
    expect(bootScript({ gaId: "G-</script><b>" })).not.toContain("</script>");
  });
});
