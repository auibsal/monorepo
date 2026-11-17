import { expect, test } from "@playwright/test";
import { event, universityDate } from "../fixtures";
import { urls } from "../playwright.config";
import { expectAccessible } from "./helpers";

test.describe("public site", () => {
  test("the footer's paperless line opens the Sustainability page", async ({
    page,
  }) => {
    await page.goto(`${urls.web}/about`);
    await page
      .getByRole("contentinfo")
      .getByRole("link", {
        name: "Paperless by default. Printed with purpose.",
      })
      .click();
    await expect(page).toHaveURL(/\/about\/sustainability$/u);
    await expect(
      page.getByRole("heading", { name: "Sustainability" })
    ).toBeVisible();
    await expect(page.getByText("Documents signed on the site")).toBeVisible();
    await expectAccessible(page);
  });

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
    // "Good to know" sits under the date and place, before the main button,
    // one row per filled field (decisions.md, Events).
    const good = page.getByRole("region", { name: "Good to know" });
    await expect(good.getByText("Who can come")).toBeVisible();
    await expect(
      good.getByRole("link", { name: /Ask for an accommodation by/u })
    ).toHaveAttribute("href", "mailto:hello@auibsal.org");
    const book = page.getByRole("link", { name: /rsvp|book/iu }).first();
    const goodBox = await good.boundingBox();
    const bookBox = await book.boundingBox();
    expect(goodBox && bookBox && goodBox.y < bookBox.y).toBe(true);
    await expect(book).toHaveAttribute(
      "href",
      new RegExp(`/account/events#${event.slug}$`, "u")
    );
    const ld = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    expect(ld.some((json) => json.includes('"@type":"Event"'))).toBe(true);
    await expectAccessible(page);
  });

  // Both editions render "Good to know" from the same fields (decisions.md,
  // Events): who can come and how, the language, the access with its
  // detail; the time range keeps its order in Arabic; no stray line sits
  // between the date and the place; the footer's Qirtas link is "Send your
  // work".
  for (const edition of [
    {
      access: "Not step-free · Seated.",
      detail: "Every seat is up steps",
      language: "English and Arabic",
      locale: "en",
      title: "Good to know",
      who: "Everyone · Booking required",
      work: "Send your work",
    },
    {
      access: "فيه درج · الحضور جلوسًا.",
      detail: "كل المقاعد فوق الدرج",
      language: "العربية والإنجليزية",
      locale: "ar",
      title: "معلومات مفيدة",
      who: "الجميع · الحجز مطلوب",
      work: "أرسل عملك",
    },
  ] as const) {
    test(`the event page's ${edition.locale} edition shows every Good to know row`, async ({
      page,
    }) => {
      const prefix = edition.locale === "ar" ? "/ar" : "";
      await page.goto(`${urls.web}${prefix}/events/${event.slug}`);
      const good = page.getByRole("region", { name: edition.title });
      await expect(good).toContainText(edition.who);
      await expect(good).toContainText(edition.language);
      await expect(good).toContainText(edition.access);
      await expect(good).toContainText(edition.detail);
      const header = page.locator("article header");
      await expect(
        header.getByText(/^(Book a place|احجز مكانًا)$/u)
      ).toHaveCount(0);
      const range = await header
        .locator("p.type-caption span")
        .nth(1)
        .textContent();
      if (edition.locale === "ar") {
        expect(range?.startsWith("\u2066")).toBe(true);
        expect(range?.trimEnd().endsWith("\u2069")).toBe(true);
      } else {
        expect(range).toMatch(
          /\d{1,2}:\d\d( [ap]\.m\.)?–\d{1,2}:\d\d [ap]\.m\./u
        );
      }
      const footer = page.getByRole("contentinfo");
      await expect(footer).not.toContainText(
        /Submit to Qirtas|أرسل إلى قرطاس/u
      );
      await expect(
        footer.getByRole("link", { name: edition.work })
      ).toBeVisible();
      await expectAccessible(page);
    });
  }

  test("Events shows the event in its month and is accessible", async ({
    page,
  }) => {
    // The fixture event is five days out (global-setup); Baghdad is UTC+3.
    const month = new Date(Date.now() + 5 * 86_400_000 + 3 * 3_600_000)
      .toISOString()
      .slice(0, 7);
    // A month is a query string (decisions.md, The site).
    await page.goto(`${urls.web}/events?month=${month}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Events");
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
    // The old path-style address was shared, so it redirects to the query.
    await page.goto(`${urls.web}/events/${month}`);
    await expect(page).toHaveURL(new RegExp(`/events\\?month=${month}$`, "u"));
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

  test("the Qirtas front page is accessible", async ({ page }) => {
    await page.goto(`${urls.web}/qirtas`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Qirtas");
    await expectAccessible(page);
  });

  test("the Editions page shows the pilot's call, and the list has its own path", async ({
    page,
  }) => {
    await page.goto(`${urls.web}/qirtas/editions`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Editions"
    );
    // The open call first, in the one open-call row (decisions.md, Qirtas).
    const open = page.getByRole("list", { name: "The open call" });
    await expect(open).toContainText("Edition 0: Haven");
    await expect(open).toContainText("Dreams and memories");
    await expect(open).toContainText("Closes");
    // "Send your work" opens the open Edition's page at its call.
    await page.goto(`${urls.web}/qirtas/editions/open`);
    await expect(page).toHaveURL(/\/qirtas\/editions\/haven/u);
    await expectAccessible(page);
    // The Edition's page holds its call: the action first, then the terms.
    await page.goto(`${urls.web}/qirtas/editions/haven`);
    await expect(
      page.getByRole("link", { name: "Submit to Haven" })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Poetry" })).toBeVisible();
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

test("a shared address that changed redirects to its new one, in both languages", async ({
  request,
}) => {
  for (const prefix of ["", "/ar"]) {
    for (const [from, to] of [
      ["/membership", "/account"],
      ["/qirtas/write", "/qirtas/editions/open"],
      ["/qirtas/submit", "/qirtas/editions/open"],
      ["/haven", "/qirtas/editions/haven"],
      ["/library/privacy", "/privacy"],
      ["/partners/join", "/partners/apply"],
      ["/qirtas/issues", "/qirtas/editions"],
      // Forms live in their flows; the old numbered addresses go on.
      ["/forms/21", "/about/contact/concern"],
      ["/forms/F-45", "/consent/trip"],
      [
        "/events/writing-workshop-2026-11-17",
        "/events/writing-workshop-2026-12-08",
      ],
    ]) {
      const response = await request.get(`${urls.web}${prefix}${from}`, {
        maxRedirects: 0,
      });
      expect(response.status(), `${prefix}${from}`).toBe(308);
      expect(response.headers().location).toBe(`${prefix}${to}`);
    }
  }
});
