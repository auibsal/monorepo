import { expect, test } from "@playwright/test";
import { editor2, president } from "../fixtures";
import { urls } from "../playwright.config";
import { setUpTwoStep, signInWithPassword } from "./helpers";

/**
 * Two officers on one set of draft minutes (Supabase Realtime). Minutes are
 * written by the President and the General Secretary, whose roles need
 * two-step sign-in: each sets up an authenticator first, as in real life.
 * Needs Realtime private channels on; set E2E_COLLAB=1 to run it (CI does).
 */
test.skip(!process.env.E2E_COLLAB, "Co-editing is not checked here");

test("two officers see each other and each other's typing", async ({
  browser,
}) => {
  const first = await (await browser.newContext()).newPage();
  const second = await (await browser.newContext()).newPage();
  await signInWithPassword(first, president.email);
  await signInWithPassword(second, editor2.email);

  await first.goto(`${urls.app}/society/minutes/new`);
  await setUpTwoStep(first);
  const title = `Shared minutes ${Date.now()}`;
  await first.getByRole("textbox", { name: "English" }).first().fill(title);
  await first.getByRole("button", { name: "Save" }).click();
  // Saving new minutes moves the editor to their own address; the room opens there.
  await expect(first).toHaveURL(/\/diwan\/society\/minutes\/(?!new)[^/?]+$/);
  const url = first.url();

  await second.goto(url);
  await setUpTwoStep(second);
  await expect(first.getByText(/Also here:/)).toBeVisible({ timeout: 20_000 });
  await first.getByRole("textbox", { name: "Text in English" }).click();
  await first.keyboard.type("Typed in the first window.");
  await expect(
    second.getByRole("textbox", { name: "Text in English" })
  ).toContainText("Typed in the first window.", { timeout: 20_000 });
});
