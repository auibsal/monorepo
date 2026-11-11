import { expect, test } from "@playwright/test";
import { admin, editor, editor2, event, PASSWORD } from "../fixtures";
import { urls } from "../playwright.config";
import { expectAccessible, setUpTwoStep, signInWithPassword } from "./helpers";

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
  await page
    .getByRole("searchbox", { name: "Contributor" })
    .fill("Tess Tester");
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

test("the design system is part of the Diwan, for officers only", async ({
  page,
  request,
}) => {
  // Its files are there for staff alone; the old address is gone.
  const file = await request.get(
    `${urls.web}/diwan/media/design/kit/index.json`
  );
  expect(file.status()).toBe(404);
  const old = await request.get(`${urls.web}/_design/index.html`, {
    maxRedirects: 0,
  });
  expect(old.status()).toBe(404);

  await signInWithPassword(page, editor.email);
  await page.goto(`${urls.web}/diwan/media/design`);
  // The Diwan's own page: its header, its menu, the design system's sections.
  await expect(
    page.getByRole("heading", { level: 1, name: "Design system" })
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "The Diwan’s sections" })
  ).toBeVisible();
  const sections = page.getByRole("navigation", {
    name: "Sections of the design system",
  });
  await expect(sections.getByRole("link", { name: "Guide" })).toHaveAttribute(
    "aria-current",
    "page"
  );
  // The entry is drawn in place, with no Storybook around it.
  const entry = page.frameLocator(
    'iframe[src*="/diwan/media/design/kit/iframe.html"]'
  );
  await expect(entry.locator("#storybook-docs")).toBeVisible();
  await expect(entry.locator("#storybook-docs")).toContainText("SAL-MED-02");
  await expect(entry.locator("#storybook-explorer-tree")).toHaveCount(0);

  await sections.getByRole("link", { name: "Components" }).click();
  await expect(page).toHaveURL(/\/diwan\/media\/design\/components-/u);
  await expect(
    sections.getByRole("link", { name: "Components" })
  ).toHaveAttribute("aria-current", "page");
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
  // A reader who hasn't signed F-40, the readers' pledge.
  await db
    .schema("governance")
    .from("form_submissions")
    .delete()
    .eq("form_key", "f40")
    .eq("submitted_by", readerId);

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
  // Signed in their platform name, after agreeing to sign electronically.
  const sign = page.getByRole("button", { name: "Sign the pledge" });
  await expect(sign).toBeDisabled();
  await page.getByLabel(/I agree to sign electronically/u).check();
  await sign.click();

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

test("an officer who manages members corrects a member's name to the official one", async ({
  browser,
}) => {
  const db = admin();
  const stamp = Date.now();
  const created = await db.auth.admin.createUser({
    email: `e2e-name-${stamp}@auib.edu.iq`,
    email_confirm: true,
    password: PASSWORD,
    user_metadata: { full_name_en: "Mariam AlHakimi" },
  });
  expect(created.error).toBeNull();
  const memberId = created.data.user?.id ?? "";

  // The General Secretary covers Membership and signs in with two steps.
  const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
  const secretaryId = users.users.find((u) => u.email === editor2.email)?.id;
  if (secretaryId) {
    const factors = await db.auth.admin.mfa.listFactors({
      userId: secretaryId,
    });
    for (const factor of factors.data?.factors ?? []) {
      await db.auth.admin.mfa.deleteFactor({
        id: factor.id,
        userId: secretaryId,
      });
    }
  }
  const page = await (await browser.newContext()).newPage();
  await signInWithPassword(page, editor2.email);
  await page.goto(`${urls.app}/membership/${memberId}`);
  await setUpTwoStep(page);
  await expect(page.getByRole("heading", { name: "Their name" })).toBeVisible();

  const english = page.getByRole("group", { name: "In English" });
  const arabic = page.getByRole("group", { name: "In Arabic" });
  const fill = async (
    group: typeof english,
    parts: [string, string, string, string]
  ) => {
    const labels = [
      "Name",
      "Father’s name",
      "Grandfather’s name",
      "Family name",
    ];
    for (const [index, label] of labels.entries()) {
      await group.getByLabel(label, { exact: true }).fill(parts[index] ?? "");
    }
  };
  // The grandfather's name is unique per run: one person, one full name.
  await fill(english, ["Mariam", "Tariq", `Ziyad${stamp}`, "Jabbir"]);
  await fill(arabic, ["مريم", "طارق", `زياد${stamp}`, "جابر"]);
  await page.getByRole("button", { name: "Save the name" }).click();
  await expect(
    page.getByText("Saved. The site now shows Mariam Jabbir.")
  ).toBeVisible();

  const saved = await db
    .schema("core")
    .from("profiles")
    .select("full_name_en, full_name_ar")
    .eq("id", memberId)
    .single();
  expect(saved.data).toEqual({
    full_name_ar: "مريم جابر",
    full_name_en: "Mariam Jabbir",
  });
  await expectAccessible(page);
});
