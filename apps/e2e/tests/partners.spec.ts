import { expect, test } from "@playwright/test";
import { admin, member, PASSWORD, president } from "../fixtures";
import { urls } from "../playwright.config";
import { latestMail, setUpTwoStep, signInWithPassword } from "./helpers";

/**
 * Partners on the platform (decisions §2, §10): an organization applies
 * and signs the memorandum by name, the Council votes and its adopted
 * resolution is recorded in the Diwan's queue, and whoever applied leads
 * the partner's team on its dashboard; it invites a guest by email, who
 * signs up from the invitation.
 */
test("an organization applies, the Council votes, and its dashboard opens", async ({
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
  await applicant.goto(`${urls.web}/partners/apply`);
  await applicant.getByLabel("Name in English").fill(organization);
  await applicant
    .getByLabel(/What the partnership is for/)
    .fill("Joint poetry readings each term.");
  // A club is at AUIB: where it works is not asked.
  await expect(applicant.getByLabel("Where", { exact: true })).toHaveCount(0);
  // Signed in the applicant's name on the platform, never typed: a
  // signature in the signature face, with their card number and the date.
  await expect(
    applicant.getByRole("figure").filter({ hasText: "E2E Partner" })
  ).toBeVisible();
  await applicant
    .getByRole("checkbox", { name: /I sign this memorandum/ })
    .click();
  await applicant.getByRole("button", { name: "Apply and sign" }).click();
  await expect(
    applicant.getByRole("heading", { name: "Application received" })
  ).toBeVisible();

  // The Council adopts its resolution at a meeting (its minutes and
  // resolution, as the Diwan keeps them); the site numbers it on adoption.
  const { data: minutes } = await db
    .schema("governance")
    .from("minutes")
    .insert({
      adopted_on: new Date().toISOString().slice(0, 10),
      body: "council",
      meeting_on: new Date().toISOString().slice(0, 10),
      status: "adopted",
      text_en: "<p>Minutes.</p>",
      title_en: "Council meeting",
    })
    .select("id")
    .single();
  const resolved = await db
    .schema("governance")
    .from("resolutions")
    .insert({
      adopted_on: new Date().toISOString().slice(0, 10),
      body: "council",
      minutes_id: minutes?.id ?? "",
      status: "adopted",
      text_en: "<p>Resolved.</p>",
      title_en: `Approves ${organization}`,
    })
    .select("code")
    .single();
  expect(resolved.error).toBeNull();
  const code = resolved.data?.code ?? "";
  expect(code).toMatch(/^RES-\d{4}-\d{3}$/);

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
  await signer.goto(`${urls.app}/partnerships/applications`);
  await setUpTwoStep(signer);
  await expect(signer.getByText(organization)).toBeVisible();
  await signer
    .getByRole("button", { name: "The Council’s resolution" })
    .click();
  await signer.getByRole("option", { name: new RegExp(code) }).click();
  await signer
    .getByRole("button", { name: "Countersign for the Society" })
    .click();
  await signer
    .getByRole("alertdialog")
    .getByRole("button", { name: "Countersign for the Society" })
    .click();
  await expect(signer.getByText("No applications are waiting.")).toBeVisible();

  await applicant.goto(`${urls.web}/partners/dashboard`);
  await expect(
    applicant.getByRole("heading", { level: 1, name: organization })
  ).toBeVisible();
  // A partner turns on what it runs with the Society by asking; the
  // Society approves.
  await applicant
    .getByRole("checkbox", { name: "Their members may volunteer at events" })
    .click();
  await applicant.getByRole("button", { name: "Ask the Society" }).click();
  await expect(
    applicant.getByText("Asked for, and waiting for the Society.")
  ).toBeVisible();
  // There are no perks or offers (decisions §2).
  await expect(applicant.getByRole("link", { name: "Perks" })).toHaveCount(0);

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
    await group.getByLabel("Father’s name", { exact: true }).fill(parts[1]);
    await group.getByLabel("Grandfather’s name").fill(parts[2]);
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
  await guest.getByRole("button", { name: "Yes, that’s fine" }).click();
  await expect(guest.getByRole("heading", { level: 1 })).toContainText(
    "Welcome"
  );
  // One Membership for everyone: the guest's Today, with a guest's card.
  await guest.goto(`${urls.web}/account`);
  await expect(guest.getByText("Guest", { exact: true }).first()).toBeVisible();
  await expect(guest.getByText(`Guest of ${organization}`)).toBeVisible();
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
  await page.goto(`${urls.web}/partners/apply`);
  await page.getByLabel("Name in English").fill(organization);
  await page
    .getByLabel(/What the partnership is for/)
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
    // The Council's vote, as the queue records it: the partner turns active
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
    await page.goto(`${urls.web}/account`);
    const row = page.getByRole("navigation", { name: "Your account" });
    for (const name of ["Calendar", "Record", "Work", "Elections"]) {
      await expect(row.getByRole("link", { name })).toBeVisible();
    }
    await page.goto(`${urls.web}/account/elections`);
    await expect(page).toHaveURL(/\/account\/elections$/);
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
