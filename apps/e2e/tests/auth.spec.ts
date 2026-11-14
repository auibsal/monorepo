import { expect, test } from "@playwright/test";
import { admin, member, PASSWORD } from "../fixtures";
import { urls } from "../playwright.config";
import { expectAccessible, latestMail, signInWithPassword } from "./helpers";

// No button offers a sign-in link by email.
const LINK = /link/iu;

test("one sign-up page: the address, the class, the official name, one line", async ({
  page,
}) => {
  const email = `e2e-${Date.now()}@auib.edu.iq`;
  // A phone's screen: the next screen must start at the top, not in the
  // footer where the button left the page.
  await page.setViewportSize({ height: 640, width: 390 });
  await page.goto(`${urls.web}/sign-up`);
  await expectAccessible(page);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  // An AUIB address says which class (decisions.md, Members).
  await page.getByRole("radio", { name: "An AUIB student" }).click();
  // The official name in both languages, four parts, on the same page.
  const english = page.getByRole("group", { name: "Your name in English" });
  await english.getByLabel("Name", { exact: true }).fill("New");
  await english.getByLabel("Father’s name").fill("Kareem");
  await english.getByLabel("Grandfather’s name").fill("Hasan");
  await english.getByLabel(/Family name/u).fill("Member");
  const arabic = page.getByRole("group", { name: "Your name in Arabic" });
  await arabic.getByLabel("Name", { exact: true }).fill("عضو");
  await arabic.getByLabel("Father’s name").fill("كريم");
  await arabic.getByLabel("Grandfather’s name").fill("حسن");
  await arabic.getByLabel(/Family name/u).fill("جديد");
  await page.getByRole("radio", { name: /In the masculine/u }).click();
  await page.getByRole("radio", { name: "Yes, 18 or older" }).click();
  // One line by the button; no boxes to agree, no signature.
  await expect(
    page.getByText(/By creating an account, you agree/u)
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your inbox")).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  const mail = await latestMail(email);
  const link = /href="([^"]*\/auth\/confirm\?[^"]+)"/u.exec(mail.HTML)?.[1];
  expect(link).toBeTruthy();
  await page.goto((link ?? "").replaceAll("&amp;", "&"));
  await page.getByRole("button", { name: /continue/iu }).click();

  // Nothing stands between confirming and the account (decisions.md,
  // Members): no setup steps, no profile step.
  await expect(page).toHaveURL(new RegExp(`${urls.web}/account/?$`, "u"));
  await expectAccessible(page);
});

test("an address outside AUIB is not asked the class", async ({ page }) => {
  await page.goto(`${urls.web}/sign-up`);
  await page.getByLabel("Email").fill("someone@example.com");
  await expect(
    page.getByRole("radio", { name: "An AUIB student" })
  ).toHaveCount(0);
  await page.getByLabel("Email").fill("someone@auib.edu.iq");
  await expect(
    page.getByRole("radio", { name: "An AUIB student" })
  ).toBeVisible();
});

// A6: the site never says whether an address has an account.
test("signing in with an address that has no account says only that it doesn't match", async ({
  page,
}) => {
  await page.goto(`${urls.web}/sign-in`);
  await page.getByLabel("Email").fill(`nobody-${Date.now()}@auib.edu.iq`);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { exact: true, name: "Sign in" }).click();
  await expect(
    page.getByText("That email and password don’t match.")
  ).toBeVisible();
  await expect(page.getByText("No account uses this address.")).toHaveCount(0);
});

test("an AUIB address signs in by password; no sign-in link is offered", async ({
  page,
}) => {
  await page.goto(`${urls.web}/sign-in`);
  await page.getByLabel("Email").fill(member.email);
  await expect(page.getByRole("button", { name: LINK })).toHaveCount(0);
  await signInWithPassword(page, member.email);
  await expectAccessible(page);
});

test("a name from before the four parts is a to-do on Today, not a block", async ({
  page,
}) => {
  const db = admin();
  const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
  const id = users.users.find((u) => u.email === member.email)?.id ?? "";
  const { data: before } = await db
    .schema("core")
    .from("profiles")
    .select("father_name_en, grandfather_name_en")
    .eq("id", id)
    .single();
  await db
    .schema("core")
    .from("profiles")
    .update({ father_name_en: null, grandfather_name_en: null })
    .eq("id", id);
  try {
    await signInWithPassword(page, member.email);
    await expect(page).toHaveURL(new RegExp(`${urls.web}/account/?$`, "u"));
    await expect(
      page.getByRole("heading", {
        name: "Part of your official name is missing",
      })
    ).toBeVisible();
  } finally {
    await db
      .schema("core")
      .from("profiles")
      .update(before ?? {})
      .eq("id", id);
  }
});
