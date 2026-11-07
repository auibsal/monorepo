import { expect, test } from "@playwright/test";
import { admin, member, PASSWORD } from "../fixtures";
import { urls } from "../playwright.config";
import { expectAccessible, latestMail, signInWithPassword } from "./helpers";

test("sign up with an AUIB address, confirm by email, finish setup", async ({
  page,
}) => {
  const local = `e2e-${Date.now()}`;
  // One person, one name: each run's new member has a grandfather's name of
  // their own (letters from the clock).
  const grandfather = `Hasan${String(Date.now()).replace(/\d/g, (d) => "abcdefghij"[Number(d)])}`;
  const email = `${local}@auib.edu.iq`;
  // A phone's screen: the next screen must start at the top, not in the
  // footer where the button left the page.
  await page.setViewportSize({ height: 640, width: 390 });
  await page.goto(`${urls.web}/sign-up`);
  await expectAccessible(page);
  // Membership is for AUIB addresses: the field takes what goes before
  // @auib.edu.iq, and needs only a password beside it.
  await page.getByLabel("Your AUIB email").fill(local);
  await page.getByLabel("Password").fill(PASSWORD);
  await expect(page.getByLabel("Family name")).toHaveCount(0);
  // Students say they are (decisions §2).
  await page.getByRole("checkbox", { name: /enrolled AUIB student/ }).check();
  await page.getByRole("checkbox", { name: /18 or older/ }).check();
  // Scrolled down to the button, as on a phone.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your inbox")).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();

  const mail = await latestMail(email);
  const link = /href="([^"]*\/auth\/confirm\?[^"]+)"/.exec(mail.HTML)?.[1];
  expect(link).toBeTruthy();
  await page.goto((link ?? "").replaceAll("&amp;", "&"));
  await page.getByRole("button", { name: /continue/i }).click();

  // One question per screen.
  // One question per screen, each at its own address.
  await expect(page).toHaveURL(/\/welcome\/1(\?|$)/);
  await expect(page.getByText("Step 1 of 5")).toBeVisible();
  await expectAccessible(page);
  // The name in four parts, in English, then in Arabic.
  await page.getByLabel("Name", { exact: true }).fill("New");
  await page.getByLabel("Father’s name", { exact: true }).fill("Kareem");
  await page.getByLabel("Grandfather’s name").fill(grandfather);
  await page.getByLabel("Family name").fill("Member");
  await page.getByLabel("Family name").press("Enter");

  await expect(page.getByText("Step 2 of 5")).toBeVisible();
  await expect(page).toHaveURL(/\/welcome\/2(\?|$)/);
  await page.getByLabel("Name", { exact: true }).fill("عضو");
  await page.getByLabel("Father’s name", { exact: true }).fill("كريم");
  await page
    .getByLabel("Grandfather’s name")
    .fill(
      `حسن${grandfather.slice(5).replace(/[a-j]/g, (c) => "ابتثجحخدذر"[c.charCodeAt(0) - 97])}`
    );
  await page.getByLabel("Family name").fill("جديد");
  // The browser's Back goes to the last screen, answers kept.
  await page.goBack();
  await expect(page.getByLabel("Father’s name", { exact: true })).toHaveValue(
    "Kareem"
  );
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByLabel("Family name")).toHaveValue("جديد");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Step 3 of 5")).toBeVisible();
  await page
    .getByRole("button", { name: "I make the Human Authorship pledge" })
    .click();
  await page.getByRole("button", { name: "I make the Member Pledge" }).click();
  await expect(
    page.getByRole("heading", { name: "Happy to appear in event photos?" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Yes, that’s fine" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Welcome, New" })
  ).toBeVisible();
  await expectAccessible(page);

  // The optional details are part of Profile (Nov 4, 2026).
  await page.getByRole("link", { name: /Tell us more about yourself/ }).click();
  await expect(page).toHaveURL(/\/account\/settings\/profile/);
  const details = page.getByRole("region", { name: "More about you" });
  // Five answers: chosen from a list under the field, not a row.
  await details.getByRole("button", { name: /You are/ }).click();
  await details.getByRole("option", { name: "A student at AUIB" }).click();
  await details.getByRole("checkbox", { name: "Poetry" }).check();
  await details.getByRole("checkbox", { name: "Theater" }).check();
  await details.getByRole("button", { name: "Save" }).click();
  await expect(details.getByRole("status")).toHaveText("Saved.");
  await expectAccessible(page);
  const users = await admin().auth.admin.listUsers({ perPage: 1000 });
  const id = users.data.users.find((u) => u.email === email)?.id ?? "";
  const { data } = await admin()
    .schema("core")
    .from("member_details")
    .select("affiliation, interests")
    .eq("user_id", id)
    .single();
  expect(data?.affiliation).toBe("student");
  expect(data?.interests).toEqual(["poetry", "theater"]);
});

test("sign-up takes only AUIB addresses", async ({ page }) => {
  await page.goto(`${urls.web}/sign-up`);
  const field = page.getByLabel("Your AUIB email");
  // Only what comes before "@" stays (Nov 7, 2026: whole addresses typed
  // into the field made accounts like name.123auib.edu.iq@auib.edu.iq).
  await field.fill("someone@example.com");
  await field.blur();
  await expect(field).toHaveValue("someone");
  await field.fill("maryam.1241295auib.edu.iq");
  await field.blur();
  await expect(field).toHaveValue("maryam.1241295");
  await expect(page.getByText("@auib.edu.iq", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Family name")).toHaveCount(0);
});

test("a whole address pasted and submitted at once signs up the right address", async ({
  page,
}) => {
  await page.goto(`${urls.web}/sign-up`);
  // Pasted, then submitted with Enter: the field is never left (no blur).
  await page
    .getByLabel("Your AUIB email")
    .fill(`paste.${Date.now()}@auib.edu.iq`);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("checkbox", { name: /enrolled AUIB student/ }).check();
  await page.getByRole("checkbox", { name: /18 or older/ }).check();
  await page.getByLabel("Password", { exact: true }).press("Enter");
  const status = page.getByRole("status").first();
  await expect(status).toContainText("@auib.edu.iq");
  await expect(status).not.toContainText("auib.edu.iq@auib.edu.iq");
  await expect(
    page.getByRole("button", { name: /Send the email again in \d+ s/ })
  ).toBeDisabled();
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

test("an AUIB address signs in by password, with a link one click away", async ({
  page,
}) => {
  await page.goto(`${urls.web}/sign-in`);
  await page.getByLabel("Email").fill(member.email);
  await expect(
    page.getByRole("button", { name: "Email me a sign-in link instead" })
  ).toBeVisible();
  await signInWithPassword(page, member.email);
  await expectAccessible(page);
});

test("a sign-in email's code works where its link can't be opened", async ({
  page,
}) => {
  await page.goto(`${urls.web}/sign-in`);
  await page.getByLabel("Email").fill(member.email);
  await page
    .getByRole("button", { name: "Email me a sign-in link instead" })
    .click();
  const sentAt = Date.now();
  await page.getByRole("button", { name: "Send the link" }).click();
  await expect(page.getByRole("status")).toContainText("type its code");

  const mail = await latestMail(member.email, sentAt);
  const code = /letter-spacing:0\.25em[^>]*>(\d{6,10})</.exec(mail.HTML)?.[1];
  expect(code).toBeTruthy();
  await page.getByLabel("Code from the email").fill(code ?? "");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(new RegExp(`${urls.web}/account/?$`));
});

test("a member with a name from before the four parts is asked for them at sign-in", async ({
  page,
}) => {
  const db = admin();
  const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
  const id = users.users.find((u) => u.email === member.email)?.id ?? "";
  // As members kept them until Oct 31, 2026: one whole name per language.
  await db
    .schema("core")
    .from("profiles")
    .update({
      father_name_ar: null,
      father_name_en: null,
      first_name_ar: null,
      first_name_en: null,
      full_name_ar: "اختبار تجريبي",
      full_name_en: "E2E Tester",
      grandfather_name_ar: null,
      grandfather_name_en: null,
      last_name_ar: null,
      last_name_en: null,
    })
    .eq("id", id);

  await page.goto(`${urls.web}/sign-in`);
  await page.getByLabel("Email").fill(member.email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { exact: true, name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/welcome\/1/);
  // The first and last words are offered as the first and fourth parts.
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("E2E");
  await expect(page.getByLabel("Family name")).toHaveValue("Tester");
  await page.getByLabel("Father’s name", { exact: true }).fill("Test");
  await page.getByLabel("Grandfather’s name").fill("Auto");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByLabel("Family name")).toHaveValue("تجريبي");
  await page.getByLabel("Father’s name", { exact: true }).fill("تجريبي");
  await page.getByLabel("Grandfather’s name").fill("آلي");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(new RegExp(`${urls.web}/account/?$`));
  await expect(page.getByText("E2E Tester").first()).toBeVisible();
});
