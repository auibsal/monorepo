import { expect, test } from "@playwright/test";
import { editor, editor2 } from "../fixtures";
import { urls } from "../playwright.config";
import { signInWithPassword } from "./helpers";

/**
 * Two editors on one site page (Supabase Realtime). Needs Realtime with
 * private channels on the stack under test; set E2E_COLLAB=1 to run it (for
 * example against a preview).
 */
test.skip(!process.env.E2E_COLLAB, "Co-editing is not checked here");

test("two editors see each other and each other's typing", async ({
  browser,
}) => {
  const first = await (await browser.newContext()).newPage();
  const second = await (await browser.newContext()).newPage();
  await signInWithPassword(first, editor.email);
  await signInWithPassword(second, editor2.email);

  await first.goto(`${urls.app}/admin/content`);
  await first
    .getByRole("button", { name: "New page" })
    .or(first.getByRole("link", { name: "New page" }))
    .first()
    .click();
  const title = `Shared draft ${Date.now()}`;
  await first.getByRole("textbox", { name: "English" }).first().fill(title);
  await first
    .getByRole("textbox", { name: "Arabic" })
    .first()
    .fill("مسودة مشتركة");
  await first
    .getByRole("textbox", { name: "Web address (slug)" })
    .fill(`shared-${Date.now()}`);
  await first.getByRole("button", { name: "Save" }).click();
  // Saving a new page moves the editor to its id; the room opens there.
  await expect(first).toHaveURL(/id=/);
  const url = first.url();

  await second.goto(url);
  await expect(first.getByText(/Also here:/)).toBeVisible({ timeout: 20_000 });
  await first.getByRole("textbox", { name: "Text in English" }).click();
  await first.keyboard.type("Typed in the first window.");
  await expect(
    second.getByRole("textbox", { name: "Text in English" })
  ).toContainText("Typed in the first window.", { timeout: 20_000 });
});
