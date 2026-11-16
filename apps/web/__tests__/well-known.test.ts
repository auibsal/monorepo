// @vitest-environment node
import { describe, expect, test } from "vitest";
import { GET as passkeys } from "@/app/.well-known/passkey-endpoints/route";

describe("the passkey endpoints", () => {
  test("send a password manager to the account's passkeys", async () => {
    const body = await passkeys().json();
    expect(body).toEqual({
      enroll: "https://auibsal.org/account/settings#passkeys",
      manage: "https://auibsal.org/account/settings#passkeys",
    });
  });
});
