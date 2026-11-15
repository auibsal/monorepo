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
  // The address says the class (a student's ends in a number): no question.
  await expect(page.getByRole("radiogroup", { name: "You are" })).toHaveCount(
    0
  );
  await expect(
    page.getByRole("radio", { name: "An AUIB student" })
  ).toHaveCount(0);
  // The official name in both languages, four parts, on the same page.
  // Four names in one line per language: a fifth is refused, and a name of
  // two words written with a space is joined by a tap.
  const english = page.getByLabel("Your four names in English");
  await english.fill("new mohammed ali kareem");
  await english.press("End");
  await english.press("Space");
  await expect(page.getByText(/Four names only/u)).toBeVisible();
  await expect(english).toHaveValue("new mohammed ali kareem");
  await page
    .getByRole("button", { name: "Join Mohammed and Ali as one name" })
    .click();
  await english.press("End");
  await english.pressSequentially(" member");
  await english.blur();
  await expect(english).toHaveValue("New Mohammed Ali Kareem Member");
  await expect(
    page.getByRole("button", { name: "Separate Mohammed and Ali" })
  ).toBeVisible();
  await page.getByLabel("Your four names in Arabic").fill("عضو كريم حسن جديد");
  await page.getByLabel("I’m 18 or older").check();
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

test("a mistyped address is put right from the inbox screen, with no second account", async ({
  page,
}) => {
  const stamp = Date.now();
  const typo = `e2e.typo${stamp}x@auib.edu.iq`;
  await page.goto(`${urls.web}/sign-up`);
  await page.getByLabel("Email").fill(`${stamp}1@auib.edu.iq`);
  // A student number of an unusual shape warns, and lets the person go on.
  await expect(page.getByText(/usually have 7 digits/u)).toBeVisible();
  await page.getByLabel("Email").fill(typo);
  await expect(page.getByText(/usually have 7 digits/u)).toHaveCount(0);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  // Four names in one line per language, read back before sending.
  const english = page.getByLabel("Your four names in English");
  await english.fill("typo kareem hasan member");
  await english.blur();
  await expect(english).toHaveValue("Typo Kareem Hasan Member");
  await page.getByLabel("Your four names in Arabic").fill("عضو كريم حسن جديد");
  await page.getByLabel("I’m 18 or older").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your inbox")).toBeVisible();

  await page.getByRole("button", { name: "Wrong address? Fix it" }).click();
  // The form is back with everything typed, and the address is free.
  await expect(page.getByLabel("Email")).toHaveValue(typo);
  await expect(english).toHaveValue("Typo Kareem Hasan Member");
  const { count } = await admin()
    .schema("governance")
    .rpc("user_by_email", { email: typo })
    .then((r) => ({ count: r.data ? 1 : 0 }));
  expect(count).toBe(0);
});

test("a partner signs up on the one page, then comes back to the memorandum", async ({
  page,
}) => {
  await page.goto(`${urls.web}/partners/apply`);
  await expect(page).toHaveURL(/\/sign-up\?next=%2Fpartners%2Fapply$/u);
  await expect(
    page.getByRole("heading", { name: "Partner with the Society" })
  ).toBeVisible();
  // Signing in instead keeps the way back.
  await expect(
    page.getByRole("main").getByRole("link", { exact: true, name: "Sign in" })
  ).toHaveAttribute("href", /next=%2Fpartners%2Fapply/u);
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
    .select("father_name_en, grandfather_name_en, last_name_en")
    .eq("id", id)
    .single();
  await db
    .schema("core")
    .from("profiles")
    .update({
      father_name_en: null,
      grandfather_name_en: null,
      last_name_en: null,
    })
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
