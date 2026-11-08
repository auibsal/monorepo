import { expect, test } from "@playwright/test";
import { urls } from "../playwright.config";

for (const locale of ["en", "ar"] as const) {
  const home = locale === "en" ? `${urls.web}/` : `${urls.web}/ar`;

  test(`the first key press reaches "skip to content" (${locale})`, async ({
    page,
  }) => {
    await page.goto(home);
    await page.keyboard.press("Tab");
    const skip = page.locator(":focus");
    await expect(skip).toHaveAttribute("href", "#main");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/u);
  });

  test(`the main menu is reached and followed by keyboard (${locale})`, async ({
    page,
  }) => {
    await page.goto(home);
    // Tab until a link to What's on has focus, then follow it.
    for (let step = 0; step < 25; step += 1) {
      await page.keyboard.press("Tab");
      const href = await page.evaluate(
        () => document.activeElement?.getAttribute("href") ?? ""
      );
      if (href.endsWith("/events")) {
        break;
      }
    }
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/events\/?$/u);
  });
}
