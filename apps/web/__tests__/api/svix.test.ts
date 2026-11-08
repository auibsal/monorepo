import { createHmac } from "node:crypto";
import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { verifySvix } = await import("@/lib/api/svix");

const key = Buffer.from("a secret key for the test only");
const secret = `whsec_${key.toString("base64")}`;
const now = 1_794_000_000_000;

const signed = (body: string, timestamp = String(now / 1000)) => {
  const signature = createHmac("sha256", key)
    .update(`msg_1.${timestamp}.${body}`)
    .digest("base64");
  return new Headers({
    "svix-id": "msg_1",
    "svix-signature": `v1,${signature}`,
    "svix-timestamp": timestamp,
  });
};

describe("Resend's webhook signature (Svix)", () => {
  test("accepts a delivery signed with the secret", () => {
    const body = '{"type":"email.bounced"}';
    expect(verifySvix(secret, signed(body), body, now)).toBe(true);
  });

  test("refuses a changed body, an old delivery or no signature", () => {
    const body = '{"type":"email.bounced"}';
    expect(verifySvix(secret, signed(body), `${body} `, now)).toBe(false);
    expect(
      verifySvix(secret, signed(body, String(now / 1000 - 600)), body, now)
    ).toBe(false);
    expect(verifySvix(secret, new Headers(), body, now)).toBe(false);
  });
});
