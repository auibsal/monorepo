import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/** How old a delivery may be (Svix's own tolerance). */
const TOLERANCE_S = 5 * 60;
const SECRET_PREFIX = /^whsec_/u;

/**
 * Verifies a webhook signed the Svix way, as Resend signs its webhooks:
 * HMAC-SHA256 of `<id>.<timestamp>.<body>` with the endpoint's secret
 * (`whsec_<base64>`), compared with each `v1,<signature>` in the header.
 */
export const verifySvix = (
  secret: string,
  headers: Headers,
  body: string,
  now = Date.now()
): boolean => {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatures = headers.get("svix-signature");
  if (!(id && timestamp && signatures)) {
    return false;
  }
  const seconds = Number(timestamp);
  if (
    !Number.isFinite(seconds) ||
    Math.abs(now / 1000 - seconds) > TOLERANCE_S
  ) {
    return false;
  }
  const key = Buffer.from(secret.replace(SECRET_PREFIX, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${body}`)
    .digest();
  return signatures.split(" ").some((part) => {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) {
      return false;
    }
    const given = Buffer.from(value, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
};
