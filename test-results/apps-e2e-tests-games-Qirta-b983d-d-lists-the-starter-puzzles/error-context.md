# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps/e2e/tests/games.spec.ts >> Qirtas games >> the games page opens on today's word and lists the starter puzzles
- Location: apps/e2e/tests/games.spec.ts:6:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('link', { name: /Word search/ })
Expected: visible
Error: strict mode violation: getByRole('link', { name: /Word search/ }) resolved to 2 elements:
    1) <a href="/qirtas/games/search" class="grid content-start gap-2 border-line border-t py-space-4 hover:underline">…</a> aka getByRole('link', { name: 'Word search Find the eight' })
    2) <a href="/qirtas/games/sal-programs-word-search" class="grid content-start gap-2 border-line border-t py-space-4 hover:underline">…</a> aka getByRole('link', { name: 'Word search SAL\'s programs' })

Call log:
  - Expect "toBeVisible" getByRole('link', { name: /Word search/ }) with timeout 5000ms
  - waiting for getByRole('link', { name: /Word search/ })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - link "Skip to content" [ref=e3] [cursor=pointer]:
      - /url: "#main"
    - banner [ref=e4]:
      - generic [ref=e5]:
        - link [ref=e6] [cursor=pointer]:
          - /url: /
          - img "AUIB Society of Arts and Letters" [ref=e7]
        - navigation "AUIB Society of Arts and Letters" [ref=e8]:
          - list [ref=e9]:
            - listitem [ref=e10]:
              - link "About" [ref=e11] [cursor=pointer]:
                - /url: /about
            - listitem [ref=e12]:
              - link "What's on" [ref=e13] [cursor=pointer]:
                - /url: /events
            - listitem [ref=e14]:
              - link "Qirtas" [ref=e15] [cursor=pointer]:
                - /url: /qirtas
            - listitem [ref=e16]:
              - link "The Company" [ref=e17] [cursor=pointer]:
                - /url: /company
            - listitem [ref=e18]:
              - link "Get involved" [ref=e19] [cursor=pointer]:
                - /url: /get-involved
            - listitem [ref=e20]:
              - link "Join" [ref=e21] [cursor=pointer]:
                - /url: /join
        - generic [ref=e23]:
          - link "Search" [ref=e24] [cursor=pointer]:
            - /url: /search
          - link "العربية" [ref=e28] [cursor=pointer]:
            - /url: /ar/qirtas/games
          - button "Dark mode" [ref=e32] [cursor=pointer]
          - link "Sign in" [ref=e37] [cursor=pointer]:
            - /url: /sign-in
    - main [ref=e41]:
      - generic [ref=e43]:
        - generic [ref=e44]:
          - link "Qirtas" [ref=e45] [cursor=pointer]:
            - /url: /qirtas
          - navigation "Sections" [ref=e46]:
            - list [ref=e47]:
              - listitem [ref=e48]:
                - link "News" [ref=e49] [cursor=pointer]:
                  - /url: /qirtas/news
              - listitem [ref=e50]:
                - link "Voices" [ref=e51] [cursor=pointer]:
                  - /url: /qirtas/voices
              - listitem [ref=e52]:
                - link "Letters" [ref=e53] [cursor=pointer]:
                  - /url: /qirtas/letters
              - listitem [ref=e54]:
                - link "Gallery" [ref=e55] [cursor=pointer]:
                  - /url: /qirtas/gallery
              - listitem [ref=e56]:
                - link "Video" [ref=e57] [cursor=pointer]:
                  - /url: /qirtas/video
              - listitem [ref=e58]:
                - link "Games" [ref=e59] [cursor=pointer]:
                  - /url: /qirtas/games
              - listitem [ref=e60]:
                - link "Editions" [ref=e61] [cursor=pointer]:
                  - /url: /qirtas/editions
              - listitem [ref=e62]:
                - link "Awards" [ref=e63] [cursor=pointer]:
                  - /url: /qirtas/awards
        - generic [ref=e64]:
          - heading "Games" [level=1] [ref=e65]
          - paragraph [ref=e66]: A word guess and a word search every day, and crosswords and word searches from Qirtas's editors.
        - region [ref=e67]:
          - generic [ref=e68]:
            - heading "Today's word · No. 22" [level=2] [ref=e69]
            - link "Play it on its own page" [ref=e70] [cursor=pointer]:
              - /url: /qirtas/games/word
          - generic [ref=e71]:
            - heading "Your guesses" [level=2] [ref=e72]
            - list [ref=e73]:
              - listitem "Guess 1" [ref=e74]:
                - img "Empty" [ref=e75]
                - img "Empty" [ref=e76]
                - img "Empty" [ref=e77]
                - img "Empty" [ref=e78]
                - img "Empty" [ref=e79]
              - listitem "Guess 2" [ref=e80]:
                - img "Empty" [ref=e81]
                - img "Empty" [ref=e82]
                - img "Empty" [ref=e83]
                - img "Empty" [ref=e84]
                - img "Empty" [ref=e85]
              - listitem "Guess 3" [ref=e86]:
                - img "Empty" [ref=e87]
                - img "Empty" [ref=e88]
                - img "Empty" [ref=e89]
                - img "Empty" [ref=e90]
                - img "Empty" [ref=e91]
              - listitem "Guess 4" [ref=e92]:
                - img "Empty" [ref=e93]
                - img "Empty" [ref=e94]
                - img "Empty" [ref=e95]
                - img "Empty" [ref=e96]
                - img "Empty" [ref=e97]
              - listitem "Guess 5" [ref=e98]:
                - img "Empty" [ref=e99]
                - img "Empty" [ref=e100]
                - img "Empty" [ref=e101]
                - img "Empty" [ref=e102]
                - img "Empty" [ref=e103]
              - listitem "Guess 6" [ref=e104]:
                - img "Empty" [ref=e105]
                - img "Empty" [ref=e106]
                - img "Empty" [ref=e107]
                - img "Empty" [ref=e108]
                - img "Empty" [ref=e109]
            - status
            - group "Keyboard" [ref=e110]:
              - generic [ref=e112]:
                - button "Q" [ref=e113] [cursor=pointer]
                - button "W" [ref=e114] [cursor=pointer]
                - button "E" [ref=e115] [cursor=pointer]
                - button "R" [ref=e116] [cursor=pointer]
                - button "T" [ref=e117] [cursor=pointer]
                - button "Y" [ref=e118] [cursor=pointer]
                - button "U" [ref=e119] [cursor=pointer]
                - button "I" [ref=e120] [cursor=pointer]
                - button "O" [ref=e121] [cursor=pointer]
                - button "P" [ref=e122] [cursor=pointer]
              - generic [ref=e123]:
                - button "A" [ref=e124] [cursor=pointer]
                - button "S" [ref=e125] [cursor=pointer]
                - button "D" [ref=e126] [cursor=pointer]
                - button "F" [ref=e127] [cursor=pointer]
                - button "G" [ref=e128] [cursor=pointer]
                - button "H" [ref=e129] [cursor=pointer]
                - button "J" [ref=e130] [cursor=pointer]
                - button "K" [ref=e131] [cursor=pointer]
                - button "L" [ref=e132] [cursor=pointer]
              - generic [ref=e133]:
                - button "Enter" [ref=e134] [cursor=pointer]
                - button "Z" [ref=e135] [cursor=pointer]
                - button "X" [ref=e136] [cursor=pointer]
                - button "C" [ref=e137] [cursor=pointer]
                - button "V" [ref=e138] [cursor=pointer]
                - button "B" [ref=e139] [cursor=pointer]
                - button "N" [ref=e140] [cursor=pointer]
                - button "M" [ref=e141] [cursor=pointer]
                - button "Delete" [ref=e142] [cursor=pointer]
            - paragraph [ref=e143]: A dark square is the right letter in the right place. A tinted square is in the word, somewhere else.
        - region [ref=e144]:
          - heading "Also every day" [level=2] [ref=e145]
          - list [ref=e146]:
            - listitem [ref=e147]:
              - link "Word search Find the eight hidden words." [ref=e148] [cursor=pointer]:
                - /url: /qirtas/games/search
                - generic [ref=e149]: Word search
                - generic [ref=e150]: Find the eight hidden words.
          - paragraph [ref=e151]: The daily games change at midnight, Baghdad time. Your progress stays in this browser.
        - region [ref=e152]:
          - heading "From the editors" [level=2] [ref=e153]
          - list [ref=e154]:
            - listitem [ref=e155]:
              - link "Crossword The first crossword Wednesday, November 4" [ref=e156] [cursor=pointer]:
                - /url: /qirtas/games/first-crossword
                - generic [ref=e157]: Crossword
                - generic [ref=e158]: The first crossword
                - generic [ref=e159]: Wednesday, November 4
            - listitem [ref=e160]:
              - link "Word search SAL's programs Wednesday, November 4" [ref=e161] [cursor=pointer]:
                - /url: /qirtas/games/sal-programs-word-search
                - generic [ref=e162]: Word search
                - generic [ref=e163]: SAL's programs
                - generic [ref=e164]: Wednesday, November 4
    - contentinfo [ref=e165]:
      - generic [ref=e166]:
        - generic [ref=e167]:
          - link [ref=e168] [cursor=pointer]:
            - /url: /
            - img "AUIB Society of Arts and Letters" [ref=e169]
          - paragraph [ref=e170]: A registered student organization of AUIB, recognized by the Office of Student Life.
        - generic [ref=e171]:
          - heading "Programs" [level=2] [ref=e172]
          - list [ref=e173]:
            - listitem [ref=e174]:
              - link "Second Chapter" [ref=e175] [cursor=pointer]:
                - /url: /events/second-chapter
            - listitem [ref=e176]:
              - link "Typewriter Tour" [ref=e177] [cursor=pointer]:
                - /url: /events/typewriter-tour
            - listitem [ref=e178]:
              - link "The Salon" [ref=e179] [cursor=pointer]:
                - /url: /events/salon
            - listitem [ref=e180]:
              - link "Book Circle" [ref=e181] [cursor=pointer]:
                - /url: /events/book-circle
            - listitem [ref=e182]:
              - link "Open Pages" [ref=e183] [cursor=pointer]:
                - /url: /events/open-pages
            - listitem [ref=e184]:
              - link "Listening Room" [ref=e185] [cursor=pointer]:
                - /url: /events/listening-room
        - generic [ref=e186]:
          - heading "Society" [level=2] [ref=e187]
          - list [ref=e188]:
            - listitem [ref=e189]:
              - link "The Council" [ref=e190] [cursor=pointer]:
                - /url: /about/council
            - listitem [ref=e191]:
              - link "Library" [ref=e192] [cursor=pointer]:
                - /url: /library
            - listitem [ref=e193]:
              - link "Partners" [ref=e194] [cursor=pointer]:
                - /url: /partners
            - listitem [ref=e195]:
              - link "Contact" [ref=e196] [cursor=pointer]:
                - /url: /about/contact
            - listitem [ref=e197]:
              - link "Press kit" [ref=e198] [cursor=pointer]:
                - /url: /about/press
            - listitem [ref=e199]:
              - link "Verify a card or certificate" [ref=e200] [cursor=pointer]:
                - /url: /verify
        - generic [ref=e201]:
          - heading "Stay in touch" [level=2] [ref=e202]
          - list [ref=e203]:
            - listitem [ref=e204]:
              - link "The Sunday Paper" [ref=e205] [cursor=pointer]:
                - /url: /sunday-paper
            - listitem [ref=e206]:
              - link "hello@auibsal.org" [ref=e207] [cursor=pointer]:
                - /url: mailto:hello@auibsal.org
            - listitem [ref=e212]:
              - link [ref=e213] [cursor=pointer]:
                - /url: https://www.instagram.com/auibsal
                - text: Instagram @auibsal
                - img "(opens in a new tab)" [ref=e214]
        - generic [ref=e217]:
          - paragraph [ref=e218]: © 2026 AUIB Society of Arts and Letters. All rights reserved.
          - list [ref=e219]:
            - listitem [ref=e220]:
              - link "Privacy and photo policy" [ref=e221] [cursor=pointer]:
                - /url: /library/privacy
            - listitem [ref=e222]:
              - link "Terms of use" [ref=e223] [cursor=pointer]:
                - /url: /library/terms-of-use
            - listitem [ref=e224]:
              - link "Accessibility" [ref=e225] [cursor=pointer]:
                - /url: /library/accessibility
          - paragraph [ref=e226]: Set in Ubuntu and Ubuntu Arabic. Written in Baghdad.
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e232] [cursor=pointer]
  - alert [ref=e236]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { urls } from "../playwright.config";
  3  | import { expectAccessible } from "./helpers";
  4  | 
  5  | test.describe("Qirtas games", () => {
  6  |   test("the games page opens on today's word and lists the starter puzzles", async ({
  7  |     page,
  8  |   }) => {
  9  |     await page.goto(`${urls.web}/qirtas/games`);
  10 |     await expect(page.getByRole("heading", { level: 1 })).toHaveText("Games");
  11 |     await expect(
  12 |       page.getByRole("heading", { level: 2, name: /Today's word/ })
  13 |     ).toBeVisible();
  14 |     await expect(page.getByRole("button", { name: "Enter" })).toBeVisible();
  15 |     await expect(
  16 |       page.getByRole("link", { name: "Play it on its own page" })
  17 |     ).toBeVisible();
> 18 |     await expect(page.getByRole("link", { name: /Word search/ })).toBeVisible();
     |                                                                   ^ Error: expect(locator).toBeVisible() failed
  19 |     await expect(
  20 |       page.getByRole("link", { name: /The first crossword/ })
  21 |     ).toBeVisible();
  22 |     await expectAccessible(page);
  23 |   });
  24 | 
  25 |   test("a finished word guess offers a result that keeps the word", async ({
  26 |     page,
  27 |   }) => {
  28 |     await page.goto(`${urls.web}/qirtas/games/word`);
  29 |     await expect(page.getByRole("button", { name: "Enter" })).toBeVisible();
  30 |     for (let i = 0; i < 6; i++) {
  31 |       await page.keyboard.type("QWERT");
  32 |       await page.keyboard.press("Enter");
  33 |     }
  34 |     await expect(
  35 |       page.getByRole("button", { name: "Share your result" })
  36 |     ).toBeVisible();
  37 |   });
  38 | 
  39 |   test("a guess in the daily word guess is marked letter by letter", async ({
  40 |     page,
  41 |   }) => {
  42 |     await page.goto(`${urls.web}/qirtas/games/word`);
  43 |     await expect(page.getByRole("button", { name: "Enter" })).toBeVisible();
  44 |     await page.keyboard.type("VERSE");
  45 |     await page.keyboard.press("Enter");
  46 |     await expect(
  47 |       page
  48 |         .getByRole("listitem", { name: "Guess 1" })
  49 |         .getByRole("img", { name: /right place|elsewhere|not in the word/ })
  50 |     ).toHaveCount(5);
  51 |     await expectAccessible(page);
  52 |   });
  53 | 
  54 |   test("the Arabic word search is right to left and counts what is found", async ({
  55 |     page,
  56 |   }) => {
  57 |     await page.goto(`${urls.web}/ar/qirtas/games/search`);
  58 |     await expect(page.getByText("وُجدت 0 من 8")).toBeVisible();
  59 |     await expect(page.locator('[lang="ar"][dir="rtl"]').first()).toBeVisible();
  60 |     await expectAccessible(page);
  61 |   });
  62 | 
  63 |   test("a starter crossword takes letters and says it was made with an AI tool", async ({
  64 |     page,
  65 |   }) => {
  66 |     await page.goto(`${urls.web}/qirtas/games/first-crossword`);
  67 |     await expect(page.getByText(/Made with an AI tool/)).toBeVisible();
  68 |     const square = page.getByRole("textbox").first();
  69 |     await square.click();
  70 |     await page.keyboard.type("x");
  71 |     await expect(square).toHaveValue("X");
  72 |     await expectAccessible(page);
  73 |   });
  74 | });
  75 | 
```