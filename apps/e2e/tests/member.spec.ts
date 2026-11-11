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
  await page.goto(`${urls.web}/qirtas/submit/poetry`);
  await page.getByLabel("Title").fill(`A small poem ${Date.now()}`);
  await page.locator('[contenteditable="true"]').first().click();
  await page.keyboard.type("The paper and the pen, and the hour between them.");
  await page.getByLabel(/has not appeared in another journal/iu).check();
  await page.getByRole("checkbox", { name: /human authorship/iu }).check();
  await page.getByRole("button", { name: "Send to Qirtas" }).click();
  await expect(page).toHaveURL(/\/account\/work\/submissions\//u);
  await expect(page.getByRole("heading", { name: "Progress" })).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toContainText("Received");
  await expectAccessible(page);
});

test("a member saves a draft, comes back to it and sends it", async ({
  page,
}) => {
  const title = `A draft poem ${Date.now()}`;
  await signInWithPassword(page, member.email);
  await page.goto(`${urls.web}/qirtas/submit/poetry`);
  await page.getByLabel("Title").fill(title);
  await page.locator('[contenteditable="true"]').first().click();
  await page.keyboard.type("Half a line, kept for later.");
  await page.getByRole("button", { name: "Save draft" }).click();
  // The first save gives the draft its own address.
  await expect(page).toHaveURL(/\/qirtas\/write\/poetry\/[0-9a-f-]{36}$/u);
  await expect(page.getByRole("button", { name: "Draft saved" })).toBeVisible();

  // Write for Qirtas lists the current drafts (decisions §18).
  await page.goto(`${urls.web}/qirtas/submit`);
  const drafts = page.getByRole("region", { name: "Your drafts" });
  const item = drafts.getByRole("listitem").filter({ hasText: title });
  await expect(item).toContainText("Poetry");
  await item.getByRole("link", { name: title }).click();
  await expect(page.getByLabel("Title")).toHaveValue(title);
  await expect(page.locator('[contenteditable="true"]').first()).toContainText(
    "Half a line, kept for later."
  );
  await expectAccessible(page);

  await page.getByLabel(/has not appeared in another journal/iu).check();
  await page.getByRole("checkbox", { name: /human authorship/iu }).check();
  await page.getByRole("button", { name: "Send to Qirtas" }).click();
  await expect(page).toHaveURL(/\/account\/work\/submissions\//u);
  // Sent, it is a submission; the draft is gone from Write for Qirtas.
  await page.goto(`${urls.web}/qirtas/submit`);
  await expect(page.getByRole("heading", { name: "Haven" })).toBeVisible();
  await expect(page.getByRole("link", { name: title })).toHaveCount(0);
});

test("a manuscript's text fills the editor, and the file goes with the work", async ({
  page,
}) => {
  await signInWithPassword(page, member.email);
  await page.goto(`${urls.web}/qirtas/submit/poetry`);
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

test("a member books on the event's own page", async ({ page }) => {
  await signInWithPassword(page, member.email);
  await page.goto(`${urls.web}/events/${event.slug}`);
  const book = page.getByRole("button", { name: "Book a place" });
  const giveBack = page.getByRole("button", { name: "Give my place back" });
  await expect(book.or(giveBack)).toBeVisible();
  if (await giveBack.isVisible()) {
    await giveBack.click();
    await expect(book).toBeVisible();
  }
  await book.click();
  await expect(
    page.getByText("Booked. A confirmation is on its way.")
  ).toBeVisible();
  await expect(giveBack).toBeVisible();
  await page.reload();
  await expect(page.getByText("You have a place.")).toBeVisible();
  await giveBack.click();
  await expect(book).toBeVisible();
  await expectAccessible(page);
});
