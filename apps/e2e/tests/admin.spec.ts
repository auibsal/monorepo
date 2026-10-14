import { expect, test } from "@playwright/test";
import { editor } from "../fixtures";
import { urls } from "../playwright.config";
import { expectAccessible, signInWithPassword } from "./helpers";

test("a News desk editor starts a piece, and it waits in Editing, unpublished", async ({
  page,
}) => {
  const title = `Society notes ${Date.now()}`;
  await signInWithPassword(page, editor.email);
  // No Overview for this role: /admin opens the first section it has.
  await page.goto(`${urls.app}/admin`);
  await expect(page).toHaveURL(/\/admin\/members/);
  await expectAccessible(page);

  await page.goto(`${urls.app}/admin/journal`);
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
    .selectOption({ label: "Waraq News Desk" });
  await page.getByRole("button", { name: "Create the piece" }).click();
  await expect(page).toHaveURL(/\/admin\/journal\/piece\?id=/);

  // The publish rule keeps it off the site until it is approved.
  await page.goto(`${urls.web}/waraq/news`);
  await expect(page.getByText(title)).toHaveCount(0);
});
