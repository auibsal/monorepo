import { runInNewContext } from "node:vm";
import { describe, expect, test } from "vitest";
import { bootScript, loaderSrc } from "./boot";
import { CONSENT_SAVED, SITE_CONSENT_COOKIE } from "./consent";

/** Runs the boot script in a fake page with the site's consent cookie. */
const run = (
  settings: Parameters<typeof bootScript>[0],
  choices?: Record<string, unknown>
) => {
  const listeners = new Map<string, (() => void)[]>();
  const cookieFor = (value?: Record<string, unknown>) =>
    value
      ? `NEXT_LOCALE=en; ${SITE_CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(value))}`
      : "NEXT_LOCALE=en";
  const document = {
    addEventListener: (name: string, fn: () => void) => {
      listeners.set(name, [...(listeners.get(name) ?? []), fn]);
    },
    cookie: cookieFor(choices),
  };
  // The sandbox is the page's window, so globals are window properties.
  const window: Record<string, unknown> = { document };
  window.window = window;
  runInNewContext(bootScript(settings), window);
  const layer = () =>
    (window.dataLayer as unknown[]).map((entry) =>
      typeof entry === "object" && entry !== null && "length" in entry
        ? Array.from(entry as ArrayLike<unknown>)
        : entry
    );
  return {
    change: (next: Record<string, unknown>) => {
      document.cookie = cookieFor(next);
      for (const fn of listeners.get(CONSENT_SAVED) ?? []) {
        fn();
      }
    },
    layer,
  };
};

const consentUpdates = (layer: unknown[]) =>
  layer.filter(
    (e) => Array.isArray(e) && e[0] === "consent" && e[1] === "update"
  ) as [string, string, Record<string, string>][];

/** The last value Google was told for a consent signal. */
const lastSignal = (layer: unknown[], signal: string) =>
  consentUpdates(layer)
    .filter(([, , update]) => signal in update)
    .at(-1)?.[2][signal];

const AD_SIGNALS = ["ad_storage", "ad_user_data", "ad_personalization"];

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
    const [first] = run({ gtmId: "GTM-ABC1" }).layer() as [
      string,
      string,
      Record<string, string>,
    ][];
    expect(first?.slice(0, 2)).toEqual(["consent", "default"]);
    expect(first?.[2]).toMatchObject({
      ad_personalization: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      analytics_storage: "denied",
    });
  });

  test("nothing is granted before the visitor answers", () => {
    const layer = run({ gtmId: "GTM-ABC1" }).layer();
    expect(lastSignal(layer, "analytics_storage")).toBe("denied");
    for (const signal of AD_SIGNALS) {
      expect(lastSignal(layer, signal)).toBe("denied");
    }
  });

  test("analytics and ads each follow only their own answer", () => {
    const analytics = run(
      { gtmId: "GTM-ABC1" },
      { ads: false, analytics: true }
    );
    expect(lastSignal(analytics.layer(), "analytics_storage")).toBe("granted");
    for (const signal of AD_SIGNALS) {
      expect(lastSignal(analytics.layer(), signal)).toBe("denied");
    }
    const ads = run({ gtmId: "GTM-ABC1" }, { ads: true, analytics: false });
    expect(lastSignal(ads.layer(), "analytics_storage")).toBe("denied");
    for (const signal of AD_SIGNALS) {
      expect(lastSignal(ads.layer(), signal)).toBe("granted");
    }
  });

  test("follows the visitor when they change their mind", () => {
    const page = run({ gtmId: "GTM-ABC1" }, { ads: true, analytics: true });
    page.change({ ads: false, analytics: false });
    expect(lastSignal(page.layer(), "analytics_storage")).toBe("denied");
    expect(lastSignal(page.layer(), "ad_storage")).toBe("denied");
  });

  test("only a real true grants", () => {
    const page = run({ gtmId: "GTM-ABC1" }, { ads: "yes", analytics: 1 });
    expect(lastSignal(page.layer(), "analytics_storage")).toBe("denied");
    expect(lastSignal(page.layer(), "ad_storage")).toBe("denied");
  });

  test("a value cannot break out of the script", () => {
    expect(bootScript({ gaId: "G-</script><b>" })).not.toContain("</script>");
  });
});
