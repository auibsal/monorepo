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
      new RegExp(`/events/book#${event.slug}$`)
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
    await page.goto(`${urls.web}/events?month=${month}`);
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
    await expect(page).toHaveURL(/auib=off/);
    await expect(
      page.getByRole("link", { name: universityDate.title })
    ).toHaveCount(0);
    // A month with nothing in it points to what comes next.
    await page.goto(`${urls.web}/events?month=2026-01&auib=off`);
    const next = page.getByText("Next:");
    await expect(next).toBeVisible();
    await expect(next.getByRole("link")).toHaveAttribute("href", /\/events\//);
  });

  test("each program is a series in What's on, at /events/<program>", async ({
    page,
  }) => {
    await page.goto(`${urls.web}/events`);
    const salon = page
      .getByRole("heading", { exact: true, name: "The Salon" })
      .getByRole("link");
    await expect(salon).toHaveAttribute("href", /\/events\/salon$/);
    await salon.click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "The Salon"
    );
    await expect(page.locator("#month")).toBeVisible();
    // After a client-side navigation the title follows the page (streamed
    // metadata): wait for it, or axe can run before it lands.
    await expect(page).toHaveTitle(/The Salon/);
    await expectAccessible(page);
    // Next Stop is Qirtas's video show, with its promise beside it.
    await page.goto(`${urls.web}/qirtas/next-stop`);
    await page
      .getByRole("main")
      .getByRole("link", { name: "Next Stop care" })
      .click();
    await expect(page).toHaveURL(/\/qirtas\/next-stop\/care$/);
  });

  test("the Qirtas front page is accessible", async ({ page }) => {
    await page.goto(`${urls.web}/qirtas`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Qirtas");
    await expectAccessible(page);
  });
});
