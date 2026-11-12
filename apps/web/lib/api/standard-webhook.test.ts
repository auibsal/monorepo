import { createHmac } from "node:crypto";
import { expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { verifyStandardWebhook } = await import("./svix");

const key = Buffer.from("a-test-secret-of-some-length").toString("base64");
const secret = `v1,whsec_${key}`;

const signed = (body: string, timestamp: number) => {
  const signature = createHmac("sha256", Buffer.from(key, "base64"))
    .update(`msg_1.${timestamp}.${body}`)
    .digest("base64");
  return new Headers({
    "webhook-id": "msg_1",
    "webhook-signature": `v1,${signature}`,
    "webhook-timestamp": String(timestamp),
  });
};

test("Supabase's Send Email hook is verified the Standard Webhooks way", () => {
  const now = Date.now();
  const body = JSON.stringify({ user: { email: "a@auib.edu.iq" } });
  const headers = signed(body, Math.floor(now / 1000));
  expect(verifyStandardWebhook(secret, headers, body, now)).toBe(true);
  expect(verifyStandardWebhook(secret, headers, `${body} `, now)).toBe(false);
  expect(
    verifyStandardWebhook(secret, headers, body, now + 10 * 60 * 1000)
  ).toBe(false);
});
