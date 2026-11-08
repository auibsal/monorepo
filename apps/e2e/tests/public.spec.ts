import { expect, test } from "@playwright/test";
import { event, universityDate } from "../fixtures";
import { urls } from "../playwright.config";
import { expectAccessible } from "./helpers";

test.describe("public site", () => {
  for (const locale of ["en", "ar"] as const) {
    test(`home renders in ${locale} and is accessible`, async ({ page }) => {
      await page.goto(`${urls.web}/${locale}`);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("html")).toHaveAttribute(
        "dir",
        locale === "ar" ? "rtl" : "ltr"
      );
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(overflow).toBeLessThanOrEqual(0);
      await expectAccessible(page);
    });
  }

  test("an event page links to booking and carries structured data", async ({
    page,
  }) => {
    await page.goto(`${urls.web}/events/${event.slug}`);
    await expect(
      page.getByRole("heading", { name: event.title })
    ).toBeVisible();
    const book = page.getByRole("link", { name: /rsvp|book/iu }).first();
    await expect(book).toHaveAttribute(
      "href",
      new RegExp(`/account/calendar#${event.slug}$`, "u")
    );
    const ld = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    expect(ld.some((json) => json.includes('"@type":"Event"'))).toBe(true);
    await expectAccessible(page);
  });

  test("What's on shows the event in its month and is accessible", async ({
    page,
  }) => {
    // The fixture event is five days out (global-setup); Baghdad is UTC+3.
    const month = new Date(Date.now() + 5 * 86_400_000 + 3 * 3_600_000)
      .toISOString()
      .slice(0, 7);
    // A month is a query string (decisions §6); the old address redirects.
    await page.goto(`${urls.web}/events?month=${month}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "What’s on"
    );
    await expect(
      page.getByRole("link", { name: event.title }).first()
    ).toBeAttached();
    // AUIB's calendar is one link, not dates beside the Society's (§10).
    await expect(
      page.getByRole("link", { name: universityDate.title })
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /AUIB’s calendar/u })
    ).toHaveAttribute("href", /auib\.edu\.iq/u);
    await expectAccessible(page);
    // A month is a query string; the old path-style address is not found.
    const old = await page.goto(`${urls.web}/events/${month}`);
    expect(old?.status()).toBe(404);
    // A month with nothing in it points to what comes next.
    await page.goto(`${urls.web}/events?month=2026-01`);
    const next = page.getByText("Next:");
    await expect(next).toBeVisible();
    await expect(next.getByRole("link")).toHaveAttribute("href", /\/events\//u);
  });

  test("every event is a standard event: no series pages", async ({ page }) => {
    // Owner, Nov 5, 2026: the recurring events are events, not series.
    const gone = await page.goto(`${urls.web}/events/salon`);
    expect(gone?.status()).toBe(404);
    // Its address is the Notion Slug; the retired names are gone (Nov 7).
    const retired = await page.goto(`${urls.web}/events/salon-2027-02-16`);
    expect(retired?.status()).toBe(404);
    // No date is published before its room is confirmed (decisions §7).
    const unplaced = await page.goto(
      `${urls.web}/events/reading-with-a-guest-2027-02-16`
    );
    expect(unplaced?.status()).toBe(404);
    await page.goto(`${urls.web}/events/${event.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      event.title
    );
    await expectAccessible(page);
    // Next Stop is the Director of Media’s (decisions.md), with its promise beside it.
    await page.goto(`${urls.web}/next-stop`);
    await page
      .getByRole("main")
      .getByRole("link", { name: "Next Stop’s promise" })
      .click();
    await expect(page).toHaveURL(/\/next-stop\/care$/u);
  });

  test("Get involved is one list of every open opportunity", async ({
    page,
  }) => {
    await page.goto(`${urls.web}/get-involved`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Get involved"
    );
    // No sections: one list, each place saying what it is.
    await expect(
      page.getByRole("main").getByRole("heading", { level: 2 })
    ).toHaveCount(0);
    await expect(
      page.getByRole("main").getByRole("listitem").first()
    ).toBeVisible();
    await expectAccessible(page);
  });

  test("a piece's text size changes the size of its text", async ({ page }) => {
    await page.goto(`${urls.web}/qirtas/news/qirtas-launches-as-one-paper`);
    const text = page.locator("article .prose p").first();
    const size = () =>
      text.evaluate((p) => Number.parseFloat(getComputedStyle(p).fontSize));
    await page.getByRole("button", { exact: true, name: "Medium" }).click();
    const medium = await size();
    await page.getByRole("button", { exact: true, name: "Large" }).click();
    expect(await size()).toBeGreaterThan(medium);
    await page.getByRole("button", { exact: true, name: "Small" }).click();
    expect(await size()).toBeLessThan(medium);
  });

  test("the Qirtas front page is accessible", async ({ page }) => {
    await page.goto(`${urls.web}/qirtas`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Qirtas");
    await expectAccessible(page);
  });

  test("before the first Edition, the Editions page shows its call, and the list has its own path", async ({
    page,
  }) => {
    await page.goto(`${urls.web}/qirtas/editions`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Editions"
    );
    await expectAccessible(page);
    await page.goto(`${urls.web}/qirtas/editions?view=list`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Editions"
    );
    await expectAccessible(page);
  });
});

test("every page in the sitemap is found, in both languages", async ({
  request,
}) => {
  const xml = await (await request.get(`${urls.web}/sitemap.xml`)).text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gu)].map((m) => m[1]);
  expect(locs.length).toBeGreaterThan(0);
  const missing: string[] = [];
  for (const loc of locs) {
    const { pathname } = new URL(loc ?? "");
    // One after another: the local build serves them on demand.
    const response = await request.get(`${urls.web}${pathname}`);
    if (response.status() !== 200) {
      missing.push(`${response.status()} ${pathname}`);
    }
  }
  expect(missing).toEqual([]);
});

test("old addresses are simply not found, in both languages", async ({
  request,
}) => {
  for (const prefix of ["", "/ar"]) {
    for (const gone of [
      "/membership",
      "/library/privacy",
      "/partners/join",
      "/search/poems",
    ]) {
      const response = await request.get(`${urls.web}${prefix}${gone}`, {
        maxRedirects: 0,
      });
      expect(response.status(), `${prefix}${gone}`).toBe(404);
    }
  }
});
