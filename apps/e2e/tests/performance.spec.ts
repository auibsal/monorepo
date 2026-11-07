import { devices, expect, type Page, test } from "@playwright/test";
import { event as fixture } from "../fixtures";
import { urls } from "../playwright.config";

/**
 * The performance budget (the design review A8, Nov 4, 2026), beside the
 * axe checks: the public pages most people land on, loaded as a mid-range
 * phone on a mobile network (Lighthouse's mobile profile: CPU four times
 * slower, 150 ms round trips, 1.6 Mbit/s down). Only against the built app
 * (E2E_START=start, as CI runs it): dev mode's bundles say nothing.
 * Measured Nov 5, 2026: LCP about 1.1 s, 385–390 kB of JavaScript and
 * 850–920 kB in all on each page; the budget leaves a little room.
 */
const BUDGET = {
  /** Cumulative layout shift. */
  cls: 0.1,
  /** Largest contentful paint, in milliseconds. */
  lcp: 2500,
  /** JavaScript sent over the network, compressed, in kilobytes. */
  scriptKb: 450,
  /** Everything sent over the network, compressed, in kilobytes. */
  totalKb: 1100,
} as const;

const PAGES = [
  "/",
  "/events",
  `/events/${fixture.slug}`,
  "/qirtas",
  "/join",
  "/partners",
] as const;

test.use({ ...devices["Moto G4"] });
test.skip(
  process.env.E2E_START !== "start",
  "Budgets are measured on the built app only"
);

/** Largest contentful paint and layout shift, watched from the start. */
const watchVitals = (page: Page) =>
  page.addInitScript(() => {
    const vitals = { cls: 0, lcp: 0 };
    (window as unknown as { vitals: typeof vitals }).vitals = vitals;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        vitals.lcp = entry.startTime;
      }
    }).observe({ buffered: true, type: "largest-contentful-paint" });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & {
        hadRecentInput: boolean;
        value: number;
      })[]) {
        if (!entry.hadRecentInput) {
          vitals.cls += entry.value;
        }
      }
    }).observe({ buffered: true, type: "layout-shift" });
  });

for (const path of PAGES) {
  test(`${path} keeps to the budget on a mid-range phone`, async ({ page }) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await cdp.send("Network.emulateNetworkConditions", {
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      latency: 150,
      offline: false,
      uploadThroughput: (750 * 1024) / 8,
    });
    const types = new Map<string, string>();
    let script = 0;
    let total = 0;
    cdp.on("Network.responseReceived", (event) => {
      types.set(event.requestId, event.type);
    });
    cdp.on("Network.loadingFinished", (event) => {
      total += event.encodedDataLength;
      if (types.get(event.requestId) === "Script") {
        script += event.encodedDataLength;
      }
    });
    await watchVitals(page);

    await page.goto(`${urls.web}${path}`, { waitUntil: "load" });
    // Let the page settle so the last paint and shifts are counted.
    await page.waitForTimeout(1500);
    const vitals = await page.evaluate(
      () =>
        (window as unknown as { vitals: { cls: number; lcp: number } }).vitals
    );
    const measured = {
      cls: Number(vitals.cls.toFixed(3)),
      lcp: Math.round(vitals.lcp),
      scriptKb: Math.round(script / 1024),
      totalKb: Math.round(total / 1024),
    };
    test.info().annotations.push({
      description: JSON.stringify(measured),
      type: "performance",
    });
    expect
      .soft(measured.lcp, "largest contentful paint")
      .toBeLessThanOrEqual(BUDGET.lcp);
    expect.soft(measured.cls, "layout shift").toBeLessThanOrEqual(BUDGET.cls);
    expect
      .soft(measured.scriptKb, "JavaScript, kB")
      .toBeLessThanOrEqual(BUDGET.scriptKb);
    expect
      .soft(measured.totalKb, "everything, kB")
      .toBeLessThanOrEqual(BUDGET.totalKb);
  });
}
