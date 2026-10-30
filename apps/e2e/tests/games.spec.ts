import { expect, test } from "@playwright/test";
import { urls } from "../playwright.config";
import { expectAccessible } from "./helpers";

test.describe("Qirtas games", () => {
  test("the games page lists the daily games and the starter puzzles", async ({
    page,
  }) => {
    await page.goto(`${urls.web}/qirtas/games`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Games");
    await expect(page.getByRole("link", { name: /Word guess/ })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /The first crossword/ })
    ).toBeVisible();
    await expectAccessible(page);
  });

  test("a guess in the daily word guess is marked letter by letter", async ({
    page,
  }) => {
    await page.goto(`${urls.web}/qirtas/games/word`);
    await expect(page.getByRole("button", { name: "Enter" })).toBeVisible();
    await page.keyboard.type("VERSE");
    await page.keyboard.press("Enter");
    await expect(
      page
        .getByRole("listitem", { name: "Guess 1" })
        .getByRole("img", { name: /right place|elsewhere|not in the word/ })
    ).toHaveCount(5);
    await expectAccessible(page);
  });

  test("the Arabic word search is right to left and counts what is found", async ({
    page,
  }) => {
    await page.goto(`${urls.web}/ar/qirtas/games/search`);
    await expect(page.getByText("وُجدت 0 من 8")).toBeVisible();
    await expect(page.locator('[lang="ar"][dir="rtl"]').first()).toBeVisible();
    await expectAccessible(page);
  });

  test("a starter crossword takes letters and says it was made with an AI tool", async ({
    page,
  }) => {
    await page.goto(`${urls.web}/qirtas/games/first-crossword`);
    await expect(page.getByText(/Made with an AI tool/)).toBeVisible();
    const square = page.getByRole("textbox").first();
    await square.click();
    await page.keyboard.type("x");
    await expect(square).toHaveValue("X");
    await expectAccessible(page);
  });
});
