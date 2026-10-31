import { createHmac } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { MAILPIT_URL, PASSWORD } from "../fixtures";
import { urls } from "../playwright.config";

/** No serious or critical WCAG 2.1 A/AA violations on the page as shown. */
export const expectAccessible = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter((v) =>
    ["serious", "critical"].includes(v.impact ?? "")
  );
  expect(
    serious.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`
    )
  ).toEqual([]);
};

export const signInWithPassword = async (page: Page, email: string) => {
  await page.goto(`${urls.web}/sign-in`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { exact: true, name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`${urls.web}/membership/?$`));
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
export const totp = (secret: string, at = Date.now()) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of secret.replace(/[=]+$/, "").toUpperCase()) {
    bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  }
  const key = Buffer.from(
    (bits.match(/.{8}/g) ?? []).map((byte) => Number.parseInt(byte, 2))
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
export const setUpTwoStep = async (page: Page) => {
  await page.getByRole("button", { name: "Set up my authenticator" }).click();
  const key = await page.locator("code").first().innerText();
  await page.getByLabel("Six-digit code").fill(totp(key.trim()));
  await page.getByRole("button", { name: "Confirm" }).click();
};
