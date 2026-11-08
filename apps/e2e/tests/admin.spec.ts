import { expect, test } from "@playwright/test";
import { admin, editor, event } from "../fixtures";
import { urls } from "../playwright.config";
import { expectAccessible, signInWithPassword } from "./helpers";

test("a News desk editor starts a piece, and it waits in Editing, unpublished", async ({
  page,
}) => {
  const title = `Society notes ${Date.now()}`;
  await signInWithPassword(page, editor.email);
  // The Diwan opens on the Desk for every officer.
  await page.goto(urls.app);
  await expect(page.getByRole("heading", { name: "Desk" })).toBeVisible();
  await expectAccessible(page);

  await page.goto(`${urls.app}/qirtas`);
  await page
    .getByRole("link", { name: "New staff piece" })
    .or(page.getByRole("button", { name: "New staff piece" }))
    .first()
    .click();
  await expect(page).toHaveURL(/\/diwan\/qirtas\/pieces\/new$/u);
  await expect(
    page.getByRole("button", { name: "Create the piece" })
  ).toBeVisible();
  await page.getByRole("textbox", { name: "English" }).first().fill(title);
  await page
    .getByRole("textbox", { name: "Arabic" })
    .first()
    .fill("ملاحظات الجمعية");
  // A byline is a member chosen from the register, here under a pen name:
  // the member first, then the pen name.
  await page.getByRole("searchbox", { name: "Contributor" }).fill("E2E Tester");
  await page.getByRole("button", { name: "Choose" }).first().click();
  await page.getByLabel("Pen name (optional)").fill("The Night Editor");
  await page.getByRole("button", { name: "Use this byline" }).click();
  await expect(page.getByText("The Night Editor")).toBeVisible();
  await page.getByRole("button", { name: "Create the piece" }).click();
  await expect(page).toHaveURL(/\/diwan\/qirtas\/pieces\/(?!new)[^/?]+$/u);

  // The publish rule keeps it off the site until it is approved.
  await page.goto(`${urls.web}/qirtas/news`);
  await expect(page.getByText(title)).toHaveCount(0);
});

test("each event has its own check-in, and the Desk opens the next one", async ({
  page,
}) => {
  await signInWithPassword(page, editor.email);
  await page.goto(urls.app);
  // The Desk's quick action goes straight to the next event's check-in.
  await expect(
    page.getByRole("link", { name: "Open check-in" })
  ).toHaveAttribute("href", /\/diwan\/events\/[^/]+\/check-in$/u);
  await page.goto(`${urls.app}/events/${event.slug}/check-in`);
  await expect(page.getByRole("status")).toContainText("checked in");
  await expectAccessible(page);
});

test("editing in the Diwan opens its own page, one step under its list", async ({
  page,
}) => {
  await signInWithPassword(page, editor.email);
  await page.goto(`${urls.app}/qirtas`);
  const contributor = page
    .getByRole("link", { name: "The Night Editor" })
    .first();
  await contributor.click();
  await expect(page).toHaveURL(/\/diwan\/qirtas\/contributors\/[^/]+$/u);
  await expect(
    page.getByRole("heading", { level: 1, name: "The Night Editor" })
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "English" })
    .first()
    .fill("Writes the Society's notes at night.");
  await page.getByRole("button", { name: "Save" }).click();
  // Saving returns to the list it came from.
  await expect(page).toHaveURL(/\/diwan\/qirtas$/u);
});

test("the design system is the Diwan's own page, for officers only", async ({
  page,
  request,
}) => {
  // Signed out: the page sends you to sign in and back; its files are not there.
  const anonymous = await request.get(`${urls.web}/diwan/media/design`, {
    maxRedirects: 0,
  });
  expect(anonymous.status()).toBe(307);
  expect(anonymous.headers().location).toContain(
    "/sign-in?next=%2Fdiwan%2Fmedia%2Fdesign"
  );
  const file = await request.get(`${urls.web}/diwan/media/design/index.json`);
  expect(file.status()).toBe(404);
  // The old address moved here.
  const old = await request.get(`${urls.web}/_design/index.html`, {
    maxRedirects: 0,
  });
  expect(old.status()).toBe(308);

  await signInWithPassword(page, editor.email);
  await page.goto(`${urls.web}/diwan/media/design`);
  // Storybook itself, not a frame, with the way back to the Diwan.
  await expect(page.locator("iframe#storybook-preview-iframe")).toBeAttached();
  await expect(page.getByRole("link", { name: "← The Diwan" })).toHaveAttribute(
    "href",
    "/diwan"
  );
  expect(await page.locator("base").getAttribute("href")).toBe(
    "/diwan/media/design/"
  );
});

test("a reader takes the pledge, then reads the work on the page and gets no file", async ({
  page,
}) => {
  const db = admin();
  const { data: users } = await db.auth.admin.listUsers({ perPage: 200 });
  const readerId = users.users.find((u) => u.email === editor.email)?.id ?? "";
  const { data: call } = await db
    .schema("journal")
    .from("calls")
    .select("id")
    .is("issue_id", null)
    .single();
  const { data: entry, error } = await db
    .schema("journal")
    .from("blind_entries")
    .upsert(
      {
        blind_id: "W-E2E2E2",
        body_html: "<p>The kettle keeps its counsel on the stove.</p>",
        call_id: call?.id ?? "",
        category: "poetry",
        language: "en",
        title: "Small Hours (e2e)",
      },
      { onConflict: "blind_id" }
    )
    .select("id")
    .single();
  expect(error).toBeNull();
  const entryId = entry?.id ?? "";
  await db
    .schema("journal")
    .from("assignments")
    .upsert(
      { blind_entry_id: entryId, read_number: 1, reader_id: readerId },
      { onConflict: "blind_entry_id,reader_id" }
    );
  await db
    .schema("journal")
    .from("reader_pledges")
    .delete()
    .eq("user_id", readerId);

  // No address of a stored file reaches the reader's browser.
  const fileAddresses: string[] = [];
  page.on("response", async (response) => {
    const text = await response.text().catch(() => "");
    if (text.includes("/storage/v1/object/")) {
      fileAddresses.push(response.url());
    }
  });

  await signInWithPassword(page, editor.email);
  await page.goto(`${urls.app}/qirtas/entries/${entryId}`);
  await expect(
    page.getByRole("heading", { name: "The readers’ pledge" })
  ).toBeVisible();
  await expect(page.getByText("The kettle keeps")).toHaveCount(0);
  await expectAccessible(page);
  await page.getByRole("button", { name: "I agree" }).click();

  const text = page.getByText("The kettle keeps its counsel on the stove.");
  await expect(text).toBeVisible();
  // Not selectable, and not printed; still in the page for screen readers.
  expect(await text.evaluate((node) => getComputedStyle(node).userSelect)).toBe(
    "none"
  );
  await page.emulateMedia({ media: "print" });
  await expect(text).toBeHidden();
  await expect(
    page.getByText("Work under review isn’t printed.")
  ).toBeVisible();
  await page.emulateMedia({ media: "screen" });
  await expectAccessible(page);
  expect(fileAddresses).toEqual([]);
});
