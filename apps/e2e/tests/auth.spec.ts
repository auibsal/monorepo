import { expect, test } from "@playwright/test";
import { admin, member, PASSWORD } from "../fixtures";
import { urls } from "../playwright.config";
import { expectAccessible, latestMail, signInWithPassword } from "./helpers";

test("sign up with an AUIB address, confirm by email, finish setup", async ({
  page,
}) => {
  const email = `e2e-${Date.now()}@auib.edu.iq`;
  // A phone's screen: the next screen must start at the top, not in the
  // footer where the button left the page.
  await page.setViewportSize({ height: 640, width: 390 });
  await page.goto(`${urls.web}/sign-up`);
  await expectAccessible(page);
  // An AUIB address needs only the address and a password.
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await expect(
    page.getByRole("group", { name: "Your name in English" })
  ).toHaveCount(0);
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
  await expect(page).toHaveURL(/\/setup\?(.*&)?step=1/);
  await expect(page.getByText("Step 1 of 5")).toBeVisible();
  await expectAccessible(page);
  await page.getByLabel("First name in English").fill("New");
  await page.getByLabel("Last name in English").fill("Member");
  await page.getByLabel("Last name in English").press("Enter");

  await expect(page.getByText("Step 2 of 5")).toBeVisible();
  await page.getByLabel("First name in Arabic").fill("عضو");
  await page.getByLabel("Last name in Arabic").fill("جديد");
  // The browser's Back goes to the last screen, answers kept.
  await page.goBack();
  await expect(page.getByLabel("First name in English")).toHaveValue("New");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByLabel("Last name in Arabic")).toHaveValue("جديد");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Step 3 of 5")).toBeVisible();
  await page
    .getByRole("button", { name: "I make the Human Authorship pledge" })
    .click();
  await page.getByRole("button", { name: "I make the Member Pledge" }).click();
  await expect(
    page.getByRole("heading", { name: "Happy to appear in event photos?" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Yes, that's fine" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Welcome, New" })
  ).toBeVisible();
  await expectAccessible(page);

  // The optional details, one question at a time, each with Skip.
  await page.getByRole("link", { name: /Tell us more about yourself/ }).click();
  await expect(page).toHaveURL(/\/membership\/more/);
  await expect(page.getByText("Question 1 of 7")).toBeVisible();
  await page.getByRole("button", { name: "A student at AUIB" }).click();
  await expect(
    page.getByRole("button", { name: "A student at AUIB" })
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Question 2 of 8")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What do you study?" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();
  await page.getByRole("button", { name: "Poetry" }).click();
  await page.getByRole("button", { name: "Theater" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expectAccessible(page);
  const thanks = page.getByRole("heading", { level: 1, name: "Thank you" });
  // Skills, languages, about you, how you heard, then the last one.
  for (const step of [4, 5, 6, 7, 8]) {
    await expect(page.getByText(`Question ${step} of 8`)).toBeVisible();
    await page.getByRole("button", { name: "Skip" }).click();
  }
  await expect(thanks).toBeVisible();
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

test("an outside address gives its names and a few words", async ({ page }) => {
  await page.goto(`${urls.web}/sign-up`);
  await page.getByLabel("Email").fill(`e2e-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill(PASSWORD);
  const create = page.getByRole("button", { name: "Create account" });
  const english = page.getByRole("group", { name: "Your name in English" });
  await expect(english).toBeVisible();
  await expect(create).toBeDisabled();
  await english.getByLabel("First name").fill("Guest");
  await english.getByLabel("Last name").fill("Writer");
  const arabic = page.getByRole("group", { name: "Your name in Arabic" });
  await arabic.getByLabel("First name").fill("ضيف");
  await arabic.getByLabel("Last name").fill("كاتب");
  await expectAccessible(page);
  await expect(create).toBeEnabled();
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
  await expect(page).toHaveURL(new RegExp(`${urls.web}/membership/?$`));
});
