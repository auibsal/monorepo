// @vitest-environment node
import { describe, expect, test } from "vitest";
import { GET as mtaSts } from "@/app/.well-known/mta-sts.txt/route";
import { GET as passkeys } from "@/app/.well-known/passkey-endpoints/route";
import { MTA_STS_MX } from "@/lib/mta-sts";

const MODE = /^mode: (testing|enforce)$/u;

describe("the MTA-STS policy (RFC 8461)", () => {
  test("is the standard's text, one MX host per line, CRLF", async () => {
    const response = mtaSts();
    expect(response.headers.get("Content-Type")).toContain("text/plain");
    const lines = (await response.text()).split("\r\n");
    expect(lines[0]).toBe("version: STSv1");
    expect(lines[1]).toMatch(MODE);
    expect(lines.filter((line) => line.startsWith("mx: "))).toEqual(
      MTA_STS_MX.map((host) => `mx: ${host}`)
    );
    expect(lines).toContain("max_age: 604800");
  });
});

describe("the passkey endpoints", () => {
  test("send a password manager to the account's passkeys", async () => {
    const body = await passkeys().json();
    expect(body).toEqual({
      enroll: "https://auibsal.org/account/settings#passkeys",
      manage: "https://auibsal.org/account/settings#passkeys",
    });
  });
});
