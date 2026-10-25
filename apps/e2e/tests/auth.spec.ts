import { expect, test } from "@playwright/test";
import { member, PASSWORD } from "../fixtures";
import { urls } from "../playwright.config";
import { expectAccessible, latestMail, signInWithPassword } from "./helpers";

test("sign up with an AUIB address, confirm by email, finish setup", async ({
  page,
}) => {
  const email = `e2e-${Date.now()}@auib.edu.iq`;
  await page.goto(`${urls.web}/sign-up`);
  await expectAccessible(page);
  const english = page.getByRole("group", { name: "Your name in English" });
  await english.getByLabel("First name").fill("New");
  await english.getByLabel("Last name").fill("Member");
  const arabic = page.getByRole("group", { name: "Your name in Arabic" });
  await arabic.getByLabel("First name").fill("عضو");
  await arabic.getByLabel("Last name").fill("جديد");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your inbox")).toBeVisible();

  const mail = await latestMail(email);
  const link = /href="([^"]*\/auth\/confirm\?[^"]+)"/.exec(mail.HTML)?.[1];
  expect(link).toBeTruthy();
  await page.goto((link ?? "").replaceAll("&amp;", "&"));
  await page.getByRole("button", { name: /continue/i }).click();

  await expect(page).toHaveURL(/\/setup/);
  await expect(page.getByText("1 of 4 done")).toBeVisible();
  await expect(page.getByLabel("First name in English")).toHaveValue("New");
  await expect(page.getByLabel("Last name in Arabic")).toHaveValue("جديد");
  await page.getByLabel("I make the Human Authorship pledge").check();
  await page.getByLabel("I make the Member Pledge").check();
  await expect(page.getByText("4 of 4 done")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  // Greeted by first name, whatever the time of day.
  await expect(
    page.getByRole("heading", { level: 1, name: /, New$/ })
  ).toBeVisible();
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
