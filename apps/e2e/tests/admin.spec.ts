import { expect, test } from "@playwright/test";
import { editor } from "../fixtures";
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
  await expect(page).toHaveURL(/\/diwan\/qirtas\/pieces\/new$/);
  await expect(
    page.getByRole("button", { name: "Create the piece" })
  ).toBeVisible();
  await page.getByRole("textbox", { name: "English" }).first().fill(title);
  await page
    .getByRole("textbox", { name: "Arabic" })
    .first()
    .fill("ملاحظات الجمعية");
  // A byline is a member, here under a pen name, chosen from the register.
  await page.getByLabel("Pen name (optional)").fill("The Night Editor");
  await page.getByRole("searchbox", { name: "Contributor" }).fill("E2E Tester");
  await page.getByRole("button", { name: "Choose" }).first().click();
  await expect(page.getByText("The Night Editor")).toBeVisible();
  await page.getByRole("button", { name: "Create the piece" }).click();
  await expect(page).toHaveURL(/\/diwan\/qirtas\/pieces\/(?!new)[^/?]+$/);

  // The publish rule keeps it off the site until it is approved.
  await page.goto(`${urls.web}/qirtas/news`);
  await expect(page.getByText(title)).toHaveCount(0);
});
