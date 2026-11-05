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
    const book = page.getByRole("link", { name: /rsvp|book/i }).first();
    await expect(book).toHaveAttribute(
      "href",
      new RegExp(`/membership/calendar#${event.slug}$`)
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
    // A month has its own address.
    await page.goto(`${urls.web}/events/${month}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "What's on"
    );
    await expect(
      page.getByRole("link", { name: event.title }).first()
    ).toBeAttached();
    // AUIB's own dates sit beside the Society's, linking to the University.
    const auib = page.getByRole("link", { name: universityDate.title }).first();
    await expect(auib).toHaveAttribute("href", universityDate.url);
    await expectAccessible(page);
    await page.getByRole("link", { name: "Hide AUIB dates" }).click();
    await expect(page).toHaveURL(new RegExp(`/events/${month}/society$`));
    await expect(
      page.getByRole("link", { name: universityDate.title })
    ).toHaveCount(0);
    // A month with nothing in it points to what comes next.
    await page.goto(`${urls.web}/events/2026-01/society`);
    const next = page.getByText("Next:");
    await expect(next).toBeVisible();
    await expect(next.getByRole("link")).toHaveAttribute("href", /\/events\//);
  });

  test("every event is a standard event: no series pages", async ({
    page,
  }) => {
    // Owner, Nov 5, 2026: the recurring events are events, not series.
    const gone = await page.goto(`${urls.web}/events/salon`);
    expect(gone?.status()).toBe(404);
    await page.goto(`${urls.web}/events/salon-2027-02-16`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "The Salon"
    );
    await expect(page).toHaveTitle(/The Salon/);
    await expectAccessible(page);
    // Next Stop is Qirtas's video show, with its promise beside it.
    await page.goto(`${urls.web}/qirtas/next-stop`);
    await page
      .getByRole("main")
      .getByRole("link", { name: "Next Stop's promise" })
      .click();
    await expect(page).toHaveURL(/\/qirtas\/next-stop\/care$/);
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
    await expect(
      page.getByRole("heading", { level: 2, name: "Open calls" })
    ).toBeVisible();
    await expectAccessible(page);
    await page.goto(`${urls.web}/qirtas/editions/list`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Editions"
    );
    await expectAccessible(page);
  });
});
