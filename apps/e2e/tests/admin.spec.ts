import { expect, test } from "@playwright/test";
import { editor } from "../fixtures";
import { urls } from "../playwright.config";
import { expectAccessible, signInWithPassword } from "./helpers";

test("a News desk editor starts a piece, and it waits in Editing, unpublished", async ({
  page,
}) => {
  const title = `Society notes ${Date.now()}`;
  await signInWithPassword(page, editor.email);
  // The Diwan opens on the overview for every officer.
  await page.goto(urls.app);
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expectAccessible(page);

  await page.goto(`${urls.app}/journal`);
  await page
    .getByRole("link", { name: "New staff piece" })
    .or(page.getByRole("button", { name: "New staff piece" }))
    .first()
    .click();
  await page.getByRole("textbox", { name: "English" }).first().fill(title);
  await page
    .getByRole("textbox", { name: "Arabic" })
    .first()
    .fill("ملاحظات الجمعية");
  await page
    .getByRole("combobox", { name: "Contributor" })
    .selectOption({ label: "Qirtas News Desk" });
  await page.getByRole("button", { name: "Create the piece" }).click();
  await expect(page).toHaveURL(/\/diwan\/journal\/piece\?id=/);

  // The publish rule keeps it off the site until it is approved.
  await page.goto(`${urls.web}/qirtas/news`);
  await expect(page.getByText(title)).toHaveCount(0);
});
