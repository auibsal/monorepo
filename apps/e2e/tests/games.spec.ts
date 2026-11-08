import { expect, test } from "@playwright/test";
import { urls } from "../playwright.config";
import { expectAccessible } from "./helpers";

test.describe("Qirtas games", () => {
  test("the games page opens on today's word and lists the other daily games", async ({
    page,
  }) => {
    await page.goto(`${urls.web}/qirtas/games`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Games");
    await expect(
      page.getByRole("heading", { level: 2, name: /Today’s word/u })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Enter" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Play it on its own page" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Find the eight hidden words/u })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Fill the grid from the clues/u })
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: /Five words with their letters scrambled/u,
      })
    ).toBeVisible();
    await expectAccessible(page);
  });

  test("a finished word guess offers a result that keeps the word", async ({
    page,
  }) => {
    await page.goto(`${urls.web}/qirtas/games/word`, {
      waitUntil: "networkidle",
    });
    await expect(page.getByRole("button", { name: "Enter" })).toBeVisible();
    // Six wrong guesses end the game.
    for (const _ of Array.from({ length: 6 })) {
      await page.keyboard.type("QWERT");
      await page.keyboard.press("Enter");
    }
    await expect(
      page.getByRole("button", { name: "Share your result" })
    ).toBeVisible();
  });

  test("a guess in the daily word guess is marked letter by letter", async ({
    page,
  }) => {
    // The keyboard listens only once the game has hydrated: the button is
    // in the server's HTML before then, and keys typed early are lost.
    await page.goto(`${urls.web}/qirtas/games/word`, {
      waitUntil: "networkidle",
    });
    await expect(page.getByRole("button", { name: "Enter" })).toBeVisible();
    await page.keyboard.type("VERSE");
    await page.keyboard.press("Enter");
    await expect(
      page
        .getByRole("listitem", { name: "Guess 1" })
        .getByRole("img", { name: /right place|elsewhere|not in the word/u })
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

  test("the daily crossword takes letters, numbered with today's game", async ({
    page,
  }) => {
    await page.goto(`${urls.web}/qirtas/games/crossword`);
    await expect(page.getByText(/No\. \d+/u)).toBeVisible();
    const square = page.getByRole("textbox").first();
    await square.click();
    await page.keyboard.type("x");
    await expect(square).toHaveValue("X");
    await expectAccessible(page);
  });

  test("the daily anagrams check a typed word", async ({ page }) => {
    await page.goto(`${urls.web}/qirtas/games/anagram`);
    await expect(page.getByText("0 of 5 solved so far.")).toBeVisible();
    await page.getByRole("button", { name: "Show the answer" }).first().click();
    await expect(page.getByRole("status").first()).toBeVisible();
    await expectAccessible(page);
  });
});
