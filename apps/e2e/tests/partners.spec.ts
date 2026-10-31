import { expect, test } from "@playwright/test";
import { admin, PASSWORD, president } from "../fixtures";
import { urls } from "../playwright.config";
import { setUpTwoStep, signInWithPassword } from "./helpers";

/**
 * Partners on the platform (owner, Oct 31, 2026): an organization applies
 * and signs the memorandum by name, the President signs for the Society in
 * the Diwan's queue, and whoever applied keeps the partner's page.
 */
test("an organization applies, the President signs, and its page opens", async ({
  browser,
}) => {
  const db = admin();
  const stamp = Date.now();
  const email = `e2e-partner-${stamp}@example.org`;
  const organization = `E2E Poetry Club ${stamp}`;
  const created = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    password: PASSWORD,
    // A partner's people give their names in four parts, like members.
    user_metadata: {
      father_name_ar: "تجريبي",
      father_name_en: "Test",
      first_name_ar: "ممثل",
      first_name_en: "E2E",
      grandfather_name_ar: "آلي",
      grandfather_name_en: "Auto",
      last_name_ar: "الشريك",
      last_name_en: "Partner",
    },
  });
  expect(created.error).toBeNull();

  const applicant = await (await browser.newContext()).newPage();
  await signInWithPassword(applicant, email);
  await applicant.goto(`${urls.web}/about/partners/join`);
  await applicant.getByLabel("Name in English").fill(organization);
  await applicant
    .getByLabel("What the partnership is for")
    .fill("Joint poetry readings each term.");
  await expect(applicant.getByLabel("Your name, as you sign")).toHaveValue(
    "E2E Partner"
  );
  await applicant
    .getByRole("checkbox", { name: /I sign this memorandum/ })
    .click();
  await applicant.getByRole("button", { name: "Apply and sign" }).click();
  await expect(
    applicant.getByRole("heading", { name: "Application received" })
  ).toBeVisible();

  // The President's two-step sign-in is set up afresh.
  const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
  const presidentId = users.users.find((u) => u.email === president.email)?.id;
  if (presidentId) {
    const factors = await db.auth.admin.mfa.listFactors({
      userId: presidentId,
    });
    for (const factor of factors.data?.factors ?? []) {
      await db.auth.admin.mfa.deleteFactor({
        id: factor.id,
        userId: presidentId,
      });
    }
  }
  const signer = await (await browser.newContext()).newPage();
  await signInWithPassword(signer, president.email);
  await signer.goto(`${urls.app}/people/verification`);
  await setUpTwoStep(signer);
  await expect(signer.getByText(organization)).toBeVisible();
  await signer.getByRole("button", { name: "Sign for the Society" }).click();
  await signer
    .getByRole("alertdialog")
    .getByRole("button", { name: "Sign for the Society" })
    .click();
  await expect(signer.getByText("No applications are waiting.")).toBeVisible();

  await applicant.goto(`${urls.app}/partner`);
  await expect(
    applicant.getByRole("heading", { level: 1, name: organization })
  ).toBeVisible();
  await applicant.getByRole("link", { name: "Perks" }).click();
  await applicant
    .getByRole("group", { name: "Offer" })
    .getByLabel("English")
    .fill("Free entry to readings");
  await applicant
    .getByRole("group", { name: "How to redeem it" })
    .getByLabel("English")
    .fill("Show your membership card at the door.");
  await applicant.getByRole("button", { name: "Add perk" }).click();
  await expect(applicant.getByText("Free entry to readings")).toBeVisible();
});
