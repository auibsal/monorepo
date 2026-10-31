import { expect, test } from "@playwright/test";
import { admin, member, PASSWORD, president } from "../fixtures";
import { urls } from "../playwright.config";
import { latestMail, setUpTwoStep, signInWithPassword } from "./helpers";

/**
 * Partners on the platform (owner, Oct 31, 2026): an organization applies
 * and signs the memorandum by name, the President signs for the Society in
 * the Diwan's queue, and whoever applied leads the partner's team on its
 * dashboard; it invites a guest, who signs up from the invitation and sees
 * the partner's perks on their account.
 */
test("an organization applies, the President signs, and its dashboard opens", async ({
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
    // A partner's people give their names in four parts, like members; an
    // outside address signs up only to apply or when invited.
    user_metadata: {
      father_name_ar: "تجريبي",
      father_name_en: "Test",
      first_name_ar: "ممثل",
      first_name_en: "E2E",
      grandfather_name_ar: "آلي",
      grandfather_name_en: "Auto",
      last_name_ar: "الشريك",
      last_name_en: "Partner",
      partner_applicant: "true",
    },
  });
  expect(created.error).toBeNull();

  const applicant = await (await browser.newContext()).newPage();
  await signInWithPassword(applicant, email);
  await applicant.goto(`${urls.web}/partners/join`);
  await applicant.getByLabel("Name in English").fill(organization);
  await applicant
    .getByLabel("What the partnership is for")
    .fill("Joint poetry readings each term.");
  await applicant
    .getByRole("checkbox", { name: "Perks for members and guests" })
    .click();
  // Signed in the applicant's name on the platform, never typed.
  const signedBy = applicant.getByLabel("Signed by");
  await expect(signedBy).toHaveValue("E2E Partner");
  await expect(signedBy).not.toBeEditable();
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

  await applicant.goto(`${urls.web}/partners/dashboard`);
  await expect(
    applicant.getByRole("heading", { level: 1, name: organization })
  ).toBeVisible();
  await applicant.getByRole("link", { name: "Perks" }).click();
  await applicant
    .getByRole("group", { name: "Offer" })
    .getByLabel("English")
    .fill(`Free entry to readings ${stamp}`);
  await applicant
    .getByRole("group", { name: "How to redeem it" })
    .getByLabel("English")
    .fill("Show your membership card at the door.");
  await applicant.getByRole("button", { name: "Add perk" }).click();
  await expect(
    applicant.getByText(`Free entry to readings ${stamp}`)
  ).toBeVisible();

  // The lead invites a guest by email; the invitation's link signs them up.
  await applicant.getByRole("link", { name: "People" }).click();
  const guestEmail = `e2e-guest-${stamp}@example.org`;
  await applicant
    .getByRole("region", { name: "Guests" })
    .getByLabel("Their email")
    .fill(guestEmail);
  await applicant.getByRole("button", { name: "Invite a guest" }).click();
  await expect(applicant.getByText("Invitation sent.")).toBeVisible();
  const { data: invitation } = await db
    .schema("governance")
    .from("partner_invitations")
    .select("code")
    .eq("email", guestEmail)
    .single();
  expect(invitation?.code).toBeTruthy();

  const guest = await (await browser.newContext()).newPage();
  await guest.goto(`${urls.web}/invite/${invitation?.code}`);
  await expect(guest.getByLabel("Email")).toHaveValue(guestEmail);
  await guest.getByLabel("Password").fill(PASSWORD);
  for (const [name, parts] of [
    ["Your name in English", ["Guest", "Ali", "Omar", "Writer"]],
    ["Your name in Arabic", ["ضيف", "علي", "عمر", "كاتب"]],
  ] as const) {
    const group = guest.getByRole("group", { name });
    await group.getByLabel("Name", { exact: true }).fill(parts[0]);
    await group.getByLabel("Father's name", { exact: true }).fill(parts[1]);
    await group.getByLabel("Grandfather's name").fill(parts[2]);
    await group.getByLabel("Family name").fill(parts[3]);
  }
  const sentAt = Date.now();
  await guest.getByRole("button", { name: "Create account" }).click();
  await expect(guest.getByText("Check your inbox")).toBeVisible();
  const mail = await latestMail(guestEmail, sentAt);
  const link = /href="([^"]*\/auth\/confirm\?[^"]+)"/.exec(mail.HTML)?.[1];
  expect(link).toBeTruthy();
  await guest.goto((link ?? "").replaceAll("&amp;", "&"));
  await guest.getByRole("button", { name: /continue/i }).click();
  await guest.getByRole("button", { name: "Accept the invitation" }).click();
  // A guest makes the pledges and answers the photo question, like a
  // member, then meets their card.
  await expect(guest).toHaveURL(/\/welcome/);
  await guest
    .getByRole("button", { name: "I make the Human Authorship pledge" })
    .click();
  await guest.getByRole("button", { name: "I make the Member Pledge" }).click();
  await guest.getByRole("button", { name: "Yes, that's fine" }).click();
  await expect(guest.getByRole("heading", { level: 1 })).toContainText(
    "Welcome"
  );
  // One Membership for everyone: the guest's Today, with a guest's card.
  await guest.goto(`${urls.web}/membership`);
  await expect(guest.getByText("Guest", { exact: true }).first()).toBeVisible();
  await expect(guest.getByText(`Guest of ${organization}`)).toBeVisible();
  await expect(
    guest.getByText(`Free entry to readings ${stamp}`)
  ).toBeVisible();
});

/**
 * A member may lead their club's partnership (owner, Oct 31, 2026): they
 * apply signed in as themselves, the President signs, and they keep every
 * member's page and a Member card, with the dashboard beside Membership.
 */
test("a member who leads their club's partnership stays a member", async ({
  browser,
}) => {
  const db = admin();
  const organization = `E2E Member Club ${Date.now()}`;
  const page = await (await browser.newContext()).newPage();
  await signInWithPassword(page, member.email);
  await page.goto(`${urls.web}/partners/join`);
  await page.getByLabel("Name in English").fill(organization);
  await page
    .getByLabel("What the partnership is for")
    .fill("Readings with the club.");
  await page.getByRole("checkbox", { name: /I sign this memorandum/ }).click();
  await page.getByRole("button", { name: "Apply and sign" }).click();
  await expect(
    page.getByRole("heading", { name: "Application received" })
  ).toBeVisible();

  const { data: partner } = await db
    .schema("governance")
    .from("partners")
    .select("id")
    .eq("name_en", organization)
    .single();
  const partnerId = partner?.id ?? "";
  try {
    // The President's signature, as in the queue: the partner turns active
    // and whoever applied leads it.
    const { data: agreement } = await db
      .schema("governance")
      .from("partner_agreements")
      .select("id")
      .eq("partner_id", partnerId)
      .single();
    const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
    const memberId = users.users.find((u) => u.email === member.email)?.id;
    await db
      .schema("governance")
      .from("partner_agreements")
      .update({ signed_at: new Date().toISOString(), status: "signed" })
      .eq("id", agreement?.id ?? "");
    await db
      .schema("governance")
      .from("partners")
      .update({ status: "active" })
      .eq("id", partnerId);
    const assigned = await db
      .schema("access")
      .from("role_assignments")
      .insert({
        role: "partner_lead",
        scope_id: partnerId,
        scope_type: "partner",
        user_id: memberId ?? "",
      });
    expect(assigned.error).toBeNull();

    // Still a member: the whole row, the Member card, and the dashboard.
    await page.goto(`${urls.web}/membership`);
    const row = page.getByRole("navigation", { name: "Membership" });
    for (const name of ["My calendar", "Society", "Record"]) {
      await expect(row.getByRole("link", { name })).toBeVisible();
    }
    await page.goto(`${urls.web}/membership/society`);
    await expect(page).toHaveURL(/\/membership\/society$/);
    // Leading a partner is not an officer's role: no Diwan.
    await page.goto(`${urls.app}`);
    await expect(page).toHaveURL(/\/partners\/dashboard$/);
    await expect(
      page.getByRole("heading", { level: 1, name: organization })
    ).toBeVisible();
  } finally {
    await db
      .schema("access")
      .from("role_assignments")
      .delete()
      .eq("scope_id", partnerId);
    await db.schema("governance").from("partners").delete().eq("id", partnerId);
  }
});
