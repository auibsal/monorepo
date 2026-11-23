import { createHmac } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { MAILPIT_URL, PASSWORD, TWO_STEP_KEYS } from "../fixtures";
import { urls } from "../playwright.config";

/** No WCAG 2.1 A or AA violation of any impact on the page as shown. */
export const expectAccessible = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`
    )
  ).toEqual([]);
};

/**
 * Each account's authenticator key, for the whole run: officers' and
 * partners' roles need two-step sign-in (from Nov 22, 2026), so the first
 * page that asks sets one up and later sign-ins give its code. Kept in a
 * file (TWO_STEP_KEYS), since a worker can restart; global-setup empties it.
 */
const readKeys = (): Record<string, string> => {
  try {
    return existsSync(TWO_STEP_KEYS)
      ? (JSON.parse(readFileSync(TWO_STEP_KEYS, "utf8")) as Record<
          string,
          string
        >)
      : {};
  } catch {
    return {};
  }
};

const keepKey = (email: string, key: string) => {
  writeFileSync(TWO_STEP_KEYS, JSON.stringify({ ...readKeys(), [email]: key }));
};

const signedInAs = new WeakMap<Page, string>();

/**
 * The page's own step, where a role needs it (not Settings' offer to set
 * one up, which anyone may ignore).
 */
const setUpButton = (page: Page) =>
  page
    .getByRole("region", { name: "Set up two-step sign-in" })
    .getByRole("button", { name: "Set up my authenticator" });

export const signInWithPassword = async (page: Page, email: string) => {
  await page.goto(`${urls.web}/sign-in`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { exact: true, name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`${urls.web}/account/?$`, "u"));
  signedInAs.set(page, email);
  // Wherever a page asks for the second step, give it, as the person would.
  await page.addLocatorHandler(setUpButton(page), async () => {
    await setUpNow(page);
  });
  await page.addLocatorHandler(
    page.getByRole("region", { name: "Enter your sign-in code" }),
    async () => {
      // While a new authenticator is set up the page shows its key, and
      // the setup gives the code itself.
      const key = readKeys()[email];
      const settingUp = page.getByAltText(
        "QR code to add SAL to an authenticator app"
      );
      if (!key || (await settingUp.isVisible())) {
        return;
      }
      await page.getByLabel("Six-digit code").fill(totp(key));
      await page.getByRole("button", { name: "Confirm" }).click();
      await expect(page.getByLabel("Six-digit code")).toBeHidden({
        timeout: 15_000,
      });
    }
  );
};

/** The newest email to an address, from the local stack's Mailpit. */
export const latestMail = async (to: string, after = 0) => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const list = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`
    );
    const body = (await list.json()) as {
      messages?: { Created: string; ID: string }[];
    };
    // Newest first; with `after`, only a message sent since then.
    const newest = body.messages?.[0];
    const id =
      newest && Date.parse(newest.Created) >= after - 1000
        ? newest.ID
        : undefined;
    if (id) {
      const message = await fetch(`${MAILPIT_URL}/api/v1/message/${id}`);
      return (await message.json()) as { HTML: string; Text: string };
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`No email for ${to}`);
};

/** The six-digit code an authenticator app shows for a key (RFC 6238). */
const totp = (secret: string, at = Date.now()) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of secret.replace(/[=]+$/u, "").toUpperCase()) {
    bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  }
  const key = Buffer.from(
    (bits.match(/.{8}/gu) ?? []).map((byte) => Number.parseInt(byte, 2))
  );
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));
  const mac = createHmac("sha1", key).update(counter).digest();
  // RFC 4226 truncation works on bits, as in apps/web/lib/totp.ts.
  // biome-ignore lint/suspicious/noBitwiseOperators: RFC 4226 truncation
  const offset = (mac.at(-1) ?? 0) & 0x0f;
  // biome-ignore lint/suspicious/noBitwiseOperators: RFC 4226 truncation
  const value = (mac.readUInt32BE(offset) & 0x7f_ff_ff_ff) % 1_000_000;
  return String(value).padStart(6, "0");
};

/**
 * An officer whose role needs two-step sign-in sets up an authenticator
 * where the Diwan asks for it, reading the key off the screen as they
 * would type it into the app.
 */
/** Sets the authenticator up: its key read off the screen, its first code. */
const setUpNow = async (page: Page) => {
  await setUpButton(page).click();
  // The key written out beside the QR code (not any other code on the page).
  const key = (
    (await page.locator("code.break-all").first().textContent()) ?? ""
  ).trim();
  const email = signedInAs.get(page);
  if (email) {
    keepKey(email, key);
  }
  await page.getByLabel("Six-digit code").fill(totp(key));
  await page.getByRole("button", { name: "Confirm" }).click();
  // Done once the step is accepted and the page goes on.
  await expect(page.getByLabel("Six-digit code")).toBeHidden({
    timeout: 15_000,
  });
};

export const setUpTwoStep = async (page: Page) => {
  // The sign-in's own handler may have set it up already.
  if (await setUpButton(page).isVisible()) {
    await setUpNow(page);
  }
};
