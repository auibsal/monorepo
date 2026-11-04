# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps/e2e/tests/public.spec.ts >> public site >> before the first Edition, the Editions page shows its call, and the list has its own path
- Location: apps/e2e/tests/public.spec.ts:126:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Open calls', level: 2 })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'Open calls', level: 2 }) with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Open calls', level: 2 })

```

```yaml
- link "Skip to content":
  - /url: "#main"
- banner:
  - link "AUIB Society of Arts and Letters":
    - /url: /
    - img "AUIB Society of Arts and Letters"
  - navigation "AUIB Society of Arts and Letters":
    - list:
      - listitem:
        - link "About":
          - /url: /about
      - listitem:
        - link "What's on":
          - /url: /events
      - listitem:
        - link "Qirtas":
          - /url: /qirtas
      - listitem:
        - link "The Company":
          - /url: /company
      - listitem:
        - link "Get involved":
          - /url: /get-involved
      - listitem:
        - link "Join":
          - /url: /join
  - link "Search":
    - /url: /search
  - link "العربية":
    - /url: /ar/qirtas/editions
  - button "Dark mode"
  - link "Sign in":
    - /url: /sign-in
- main:
  - link "Qirtas":
    - /url: /qirtas
  - navigation "Sections":
    - list:
      - listitem:
        - link "News":
          - /url: /qirtas/news
      - listitem:
        - link "Voices":
          - /url: /qirtas/voices
      - listitem:
        - link "Letters":
          - /url: /qirtas/letters
      - listitem:
        - link "Gallery":
          - /url: /qirtas/gallery
      - listitem:
        - link "Video":
          - /url: /qirtas/video
      - listitem:
        - link "Games":
          - /url: /qirtas/games
      - listitem:
        - link "Editions":
          - /url: /qirtas/editions
      - listitem:
        - link "Awards":
          - /url: /qirtas/awards
  - heading "Editions" [level=1]
  - paragraph: Each semester an Edition gathers the best Letters and Gallery work, launched at Launch Night.
  - list "Editions":
    - listitem:
      - link "Preview 6 Season 6":
        - /url: /qirtas/editions/preview-6
    - listitem:
      - link "Preview 5 Season 5":
        - /url: /qirtas/editions/preview-5
    - listitem:
      - link "Preview 4 Season 4":
        - /url: /qirtas/editions/preview-4
    - listitem:
      - link "Preview 3 Season 3":
        - /url: /qirtas/editions/preview-3
    - listitem:
      - link "Preview 2 Season 2":
        - /url: /qirtas/editions/preview-2
    - listitem:
      - link "Preview 1 Season 1":
        - /url: /qirtas/editions/preview-1
  - link "See the Editions as a list":
    - /url: /qirtas/editions/list
  - button "Previous Edition" [disabled]
  - button "Next Edition"
- contentinfo:
  - link "AUIB Society of Arts and Letters":
    - /url: /
    - img "AUIB Society of Arts and Letters"
  - paragraph: A registered student organization of AUIB, recognized by the Office of Student Life.
  - heading "Programs" [level=2]
  - list:
    - listitem:
      - link "Second Chapter":
        - /url: /events/second-chapter
    - listitem:
      - link "Typewriter Tour":
        - /url: /events/typewriter-tour
    - listitem:
      - link "The Salon":
        - /url: /events/salon
    - listitem:
      - link "Book Circle":
        - /url: /events/book-circle
    - listitem:
      - link "Open Pages":
        - /url: /events/open-pages
    - listitem:
      - link "Listening Room":
        - /url: /events/listening-room
  - heading "Society" [level=2]
  - list:
    - listitem:
      - link "The Council":
        - /url: /about/council
    - listitem:
      - link "Library":
        - /url: /library
    - listitem:
      - link "Partners":
        - /url: /partners
    - listitem:
      - link "Contact":
        - /url: /about/contact
    - listitem:
      - link "Press kit":
        - /url: /about/press
    - listitem:
      - link "Verify a card or certificate":
        - /url: /verify
  - heading "Stay in touch" [level=2]
  - list:
    - listitem:
      - link "The Sunday Paper":
        - /url: /sunday-paper
    - listitem:
      - link "hello@auibsal.org":
        - /url: mailto:hello@auibsal.org
    - listitem:
      - link "Instagram @auibsal (opens in a new tab)":
        - /url: https://www.instagram.com/auibsal
        - text: Instagram @auibsal
        - img "(opens in a new tab)"
  - paragraph: © 2026 AUIB Society of Arts and Letters. All rights reserved.
  - list:
    - listitem:
      - link "Privacy and photo policy":
        - /url: /library/privacy
    - listitem:
      - link "Terms of use":
        - /url: /library/terms-of-use
    - listitem:
      - link "Accessibility":
        - /url: /library/accessibility
  - paragraph: Set in Ubuntu and Ubuntu Arabic. Written in Baghdad.
- region "Notifications alt+T"
- alert
```

# Test source

```ts
  35  |     );
  36  |     const ld = await page
  37  |       .locator('script[type="application/ld+json"]')
  38  |       .allTextContents();
  39  |     expect(ld.some((json) => json.includes('"@type":"Event"'))).toBe(true);
  40  |     await expectAccessible(page);
  41  |   });
  42  | 
  43  |   test("What's on shows the event in its month and is accessible", async ({
  44  |     page,
  45  |   }) => {
  46  |     // The fixture event is five days out (global-setup); Baghdad is UTC+3.
  47  |     const month = new Date(Date.now() + 5 * 86_400_000 + 3 * 3_600_000)
  48  |       .toISOString()
  49  |       .slice(0, 7);
  50  |     // A month has its own address.
  51  |     await page.goto(`${urls.web}/events/${month}`);
  52  |     await expect(page.getByRole("heading", { level: 1 })).toHaveText(
  53  |       "What's on"
  54  |     );
  55  |     await expect(
  56  |       page.getByRole("link", { name: event.title }).first()
  57  |     ).toBeAttached();
  58  |     // AUIB's own dates sit beside the Society's, linking to the University.
  59  |     const auib = page.getByRole("link", { name: universityDate.title }).first();
  60  |     await expect(auib).toHaveAttribute("href", universityDate.url);
  61  |     await expectAccessible(page);
  62  |     await page.getByRole("link", { name: "Hide AUIB dates" }).click();
  63  |     await expect(page).toHaveURL(new RegExp(`/events/${month}/society$`));
  64  |     await expect(
  65  |       page.getByRole("link", { name: universityDate.title })
  66  |     ).toHaveCount(0);
  67  |     // A month with nothing in it points to what comes next.
  68  |     await page.goto(`${urls.web}/events/2026-01/society`);
  69  |     const next = page.getByText("Next:");
  70  |     await expect(next).toBeVisible();
  71  |     await expect(next.getByRole("link")).toHaveAttribute("href", /\/events\//);
  72  |   });
  73  | 
  74  |   test("each program is a series in What's on, at /events/<program>", async ({
  75  |     page,
  76  |   }) => {
  77  |     await page.goto(`${urls.web}/events`);
  78  |     // The programs are the row above the month; no list of them below it.
  79  |     const salon = page
  80  |       .getByRole("main")
  81  |       .getByRole("navigation")
  82  |       .getByRole("link", { exact: true, name: "The Salon" });
  83  |     await expect(page.locator("#series")).toHaveCount(0);
  84  |     await expect(salon).toHaveAttribute("href", /\/events\/salon$/);
  85  |     await salon.click();
  86  |     await expect(page.getByRole("heading", { level: 1 })).toHaveText(
  87  |       "The Salon"
  88  |     );
  89  |     await expect(page.locator("#month")).toBeVisible();
  90  |     // After a client-side navigation the title follows the page (streamed
  91  |     // metadata): wait for it, or axe can run before it lands.
  92  |     await expect(page).toHaveTitle(/The Salon/);
  93  |     await expectAccessible(page);
  94  |     // Next Stop is Qirtas's video show, with its promise beside it.
  95  |     await page.goto(`${urls.web}/qirtas/next-stop`);
  96  |     await page
  97  |       .getByRole("main")
  98  |       .getByRole("link", { name: "Next Stop's promise" })
  99  |       .click();
  100 |     await expect(page).toHaveURL(/\/qirtas\/next-stop\/care$/);
  101 |   });
  102 | 
  103 |   test("Get involved is one list of every open opportunity", async ({
  104 |     page,
  105 |   }) => {
  106 |     await page.goto(`${urls.web}/get-involved`);
  107 |     await expect(page.getByRole("heading", { level: 1 })).toHaveText(
  108 |       "Get involved"
  109 |     );
  110 |     // No sections: one list, each place saying what it is.
  111 |     await expect(
  112 |       page.getByRole("main").getByRole("heading", { level: 2 })
  113 |     ).toHaveCount(0);
  114 |     await expect(
  115 |       page.getByRole("main").getByRole("listitem").first()
  116 |     ).toBeVisible();
  117 |     await expectAccessible(page);
  118 |   });
  119 | 
  120 |   test("the Qirtas front page is accessible", async ({ page }) => {
  121 |     await page.goto(`${urls.web}/qirtas`);
  122 |     await expect(page.getByRole("heading", { level: 1 })).toHaveText("Qirtas");
  123 |     await expectAccessible(page);
  124 |   });
  125 | 
  126 |   test("before the first Edition, the Editions page shows its call, and the list has its own path", async ({
  127 |     page,
  128 |   }) => {
  129 |     await page.goto(`${urls.web}/qirtas/editions`);
  130 |     await expect(page.getByRole("heading", { level: 1 })).toHaveText(
  131 |       "Editions"
  132 |     );
  133 |     await expect(
  134 |       page.getByRole("heading", { level: 2, name: "Open calls" })
> 135 |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
  136 |     await expectAccessible(page);
  137 |     await page.goto(`${urls.web}/qirtas/editions/list`);
  138 |     await expect(page.getByRole("heading", { level: 1 })).toHaveText(
  139 |       "Editions"
  140 |     );
  141 |     await expectAccessible(page);
  142 |   });
  143 | });
  144 | 
```