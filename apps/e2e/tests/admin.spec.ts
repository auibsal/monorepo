import { expect, test } from "@playwright/test";
import { editor, event } from "../fixtures";
import { urls } from "../playwright.config";
import { expectAccessible, signInWithPassword } from "./helpers";

test("a News desk editor starts a piece, and it waits in Editing, unpublished", async ({
  page,
}) => {
  const title = `Society notes ${Date.now()}`;
  await signInWithPassword(page, editor.email);
  // The Diwan opens on the Desk for every officer.
  await page.goto(urls.app);
  await expect(page.getByRole("heading", { name: "Desk" })).toBeVisible();
  await expectAccessible(page);

  await page.goto(`${urls.app}/qirtas`);
  await page
    .getByRole("link", { name: "New staff piece" })
    .or(page.getByRole("button", { name: "New staff piece" }))
    .first()
    .click();
  await expect(page).toHaveURL(/\/diwan\/qirtas\/pieces\/new$/u);
  await expect(
    page.getByRole("button", { name: "Create the piece" })
  ).toBeVisible();
  await page.getByRole("textbox", { name: "English" }).first().fill(title);
  await page
    .getByRole("textbox", { name: "Arabic" })
    .first()
    .fill("ملاحظات الجمعية");
  // A byline is a member chosen from the register, here under a pen name:
  // the member first, then the pen name.
  await page.getByRole("searchbox", { name: "Contributor" }).fill("E2E Tester");
  await page.getByRole("button", { name: "Choose" }).first().click();
  await page.getByLabel("Pen name (optional)").fill("The Night Editor");
  await page.getByRole("button", { name: "Use this byline" }).click();
  await expect(page.getByText("The Night Editor")).toBeVisible();
  await page.getByRole("button", { name: "Create the piece" }).click();
  await expect(page).toHaveURL(/\/diwan\/qirtas\/pieces\/(?!new)[^/?]+$/u);

  // The publish rule keeps it off the site until it is approved.
  await page.goto(`${urls.web}/qirtas/news`);
  await expect(page.getByText(title)).toHaveCount(0);
});

test("each event has its own check-in, and the Desk opens the next one", async ({
  page,
}) => {
  await signInWithPassword(page, editor.email);
  await page.goto(urls.app);
  // The Desk's quick action goes straight to the next event's check-in.
  await expect(
    page.getByRole("link", { name: "Open check-in" })
  ).toHaveAttribute("href", /\/diwan\/events\/[^/]+\/check-in$/u);
  await page.goto(`${urls.app}/events/${event.slug}/check-in`);
  await expect(page.getByRole("status")).toContainText("checked in");
  await expectAccessible(page);
});

test("editing in the Diwan opens its own page, one step under its list", async ({
  page,
}) => {
  await signInWithPassword(page, editor.email);
  await page.goto(`${urls.app}/qirtas`);
  const contributor = page
    .getByRole("link", { name: "The Night Editor" })
    .first();
  await contributor.click();
  await expect(page).toHaveURL(/\/diwan\/qirtas\/contributors\/[^/]+$/u);
  await expect(
    page.getByRole("heading", { level: 1, name: "The Night Editor" })
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "English" })
    .first()
    .fill("Writes the Society's notes at night.");
  await page.getByRole("button", { name: "Save" }).click();
  // Saving returns to the list it came from.
  await expect(page).toHaveURL(/\/diwan\/qirtas$/u);
});

test("the design system's files open for officers only", async ({
  page,
  request,
}) => {
  const anonymous = await request.get(`${urls.web}/_design/index.html`);
  expect(anonymous.status()).toBe(404);
  await signInWithPassword(page, editor.email);
  const staff = await page.request.get(`${urls.web}/_design/index.html`);
  expect(staff.status()).toBe(200);
  expect(staff.headers()["content-type"]).toContain("text/html");
});
