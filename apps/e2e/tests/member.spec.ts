import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { event, member } from "../fixtures";
import { urls } from "../playwright.config";
import { expectAccessible, signInWithPassword } from "./helpers";

test("a member books a place and gives it back", async ({ page }) => {
  await signInWithPassword(page, member.email);
  await page.goto(`${urls.web}/account/calendar`);
  const card = page.locator(`li#${event.slug}`);
  await expect(card).toBeVisible();
  await expectAccessible(page);
  if (
    await card.getByRole("button", { name: "Give my place back" }).isVisible()
  ) {
    // Asked in place: the link, then the confirmation.
    await card.getByRole("button", { name: "Give my place back" }).click();
    await card.getByRole("button", { name: "Give my place back" }).click();
    await expect(card.getByRole("status")).toBeVisible();
  }
  await card.getByRole("button", { name: "Book a place" }).click();
  await expect(card.getByRole("status")).toContainText("Booked");
  await expect(card.getByText("You have a place.")).toBeVisible();
  await card.getByRole("button", { name: "Give my place back" }).click();
  await expect(
    card.getByText("Give your place to someone else?")
  ).toBeVisible();
  await card.getByRole("button", { name: "Give my place back" }).click();
  await expect(card.getByRole("status")).toContainText("Done");
});

test("a member sends work to Qirtas and sees the reading timeline", async ({
  page,
}) => {
  await signInWithPassword(page, member.email);
  await page.goto(`${urls.web}/qirtas/write/poetry`);
  await page.getByLabel("Title").fill(`A small poem ${Date.now()}`);
  await page.locator('[contenteditable="true"]').first().click();
  await page.keyboard.type("The paper and the pen, and the hour between them.");
  await page.getByLabel(/has not appeared in another journal/i).check();
  await page.getByRole("checkbox", { name: /human authorship/i }).check();
  await page.getByRole("button", { name: "Send to Qirtas" }).click();
  await expect(page).toHaveURL(/\/account\/work\/submissions\//);
  await expect(page.getByRole("heading", { name: "Progress" })).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toContainText("Received");
  await expectAccessible(page);
});

test("a member saves a draft, comes back to it and sends it", async ({
  page,
}) => {
  const title = `A draft poem ${Date.now()}`;
  await signInWithPassword(page, member.email);
  await page.goto(`${urls.web}/qirtas/write/poetry`);
  await page.getByLabel("Title").fill(title);
  await page.locator('[contenteditable="true"]').first().click();
  await page.keyboard.type("Half a line, kept for later.");
  await page.getByRole("button", { name: "Save draft" }).click();
  // The first save gives the draft its own address.
  await expect(page).toHaveURL(/\/qirtas\/write\/poetry\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("button", { name: "Draft saved" })).toBeVisible();

  await page.goto(`${urls.web}/qirtas/write`);
  const row = page.getByRole("row", { name: new RegExp(title) });
  await expect(row).toContainText("Draft, not sent");
  await row.getByRole("link", { name: title }).click();
  await expect(page.getByLabel("Title")).toHaveValue(title);
  await expect(page.locator('[contenteditable="true"]').first()).toContainText(
    "Half a line, kept for later."
  );
  await expectAccessible(page);

  await page.getByLabel(/has not appeared in another journal/i).check();
  await page.getByRole("checkbox", { name: /human authorship/i }).check();
  await page.getByRole("button", { name: "Send to Qirtas" }).click();
  await expect(page).toHaveURL(/\/account\/work\/submissions\//);
  // Sent, it is a submission; the draft is gone.
  await page.goto(`${urls.web}/qirtas/write`);
  await expect(
    page.getByRole("row", { name: new RegExp(title) })
  ).not.toContainText("Draft, not sent");
});

test("a manuscript's text fills the editor, and the file goes with the work", async ({
  page,
}) => {
  await signInWithPassword(page, member.email);
  await page.goto(`${urls.web}/qirtas/write/poetry`);
  const editor = page.locator('[contenteditable="true"]').first();
  await page
    .getByLabel("Manuscript (PDF or Word)")
    .setInputFiles(join(import.meta.dirname, "..", "files", "manuscript.docx"));
  await expect(editor).toContainText("The river keeps the city's letters.");
  await expect(editor.locator("em")).toContainText("A second stanza");
  // A second file offers to replace what is there.
  await page
    .getByLabel("Manuscript (PDF or Word)")
    .setInputFiles(join(import.meta.dirname, "..", "files", "manuscript.pdf"));
  await page.getByRole("button", { name: "Use it" }).click();
  await expect(editor).toContainText("The paper remembers every hand.");
  await expect(
    page.getByText("Manuscript (PDF or Word): manuscript.pdf")
  ).toBeVisible();
});
