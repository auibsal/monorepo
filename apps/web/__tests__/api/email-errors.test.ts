import { EmailConfigError, EmailQuotaError, sendError } from "@repo/email/errors";
import { describe, expect, test } from "vitest";

describe("why a send failed", () => {
  test("a spent limit, the configuration, or the email itself", () => {
    expect(
      sendError({ message: "limit", name: "daily_quota_exceeded" })
    ).toBeInstanceOf(EmailQuotaError);
    expect(
      sendError({ message: "bad key", name: "restricted_api_key" })
    ).toBeInstanceOf(EmailConfigError);
    expect(
      sendError({
        message:
          "The associated domain with your API key is not verified. Please, create a new API key with full access or with a verified domain.",
        name: "validation_error",
      })
    ).toBeInstanceOf(EmailConfigError);
    const other = sendError({
      message: "invalid address",
      name: "validation_error",
    });
    expect(other).not.toBeInstanceOf(EmailConfigError);
    expect(other).not.toBeInstanceOf(EmailQuotaError);
  });
});
