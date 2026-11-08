// @vitest-environment node
import {
  contentSecurityPolicy,
  createNonce,
  scriptHash,
  securityOptionsWith,
  withNonce,
} from "@repo/security/proxy";
import { describe, expect, test } from "vitest";
import { themeScript } from "@/lib/theme";

const BASE64_128 = /^[A-Za-z0-9+/]{22}==$/;

const directive = (policy: string, name: string) =>
  policy
    .split("; ")
    .find((part) => part.startsWith(`${name} `))
    ?.split(" ")
    .slice(1) ?? [];

describe("the Content Security Policy", () => {
  test("the public site's pages frame nothing and embed nothing", () => {
    const policy = contentSecurityPolicy(securityOptionsWith());
    expect(directive(policy, "frame-ancestors")).toEqual(["'none'"]);
    expect(directive(policy, "object-src")).toEqual(["'none'"]);
    expect(directive(policy, "base-uri")).toEqual(["'none'"]);
    expect(directive(policy, "script-src")).not.toContain("'strict-dynamic'");
  });

  test("your account and the Diwan run only this response's scripts", async () => {
    const nonce = createNonce();
    const hash = await scriptHash(themeScript);
    const policy = contentSecurityPolicy(
      withNonce(securityOptionsWith(), nonce, [hash])
    );
    const scripts = directive(policy, "script-src");
    expect(scripts).toContain(`'nonce-${nonce}'`);
    expect(scripts).toContain("'strict-dynamic'");
    expect(scripts).toContain(hash);
  });

  test("each nonce is new, 128 bits in base64", () => {
    const first = createNonce();
    expect(first).toMatch(BASE64_128);
    expect(createNonce()).not.toBe(first);
  });

  test("the theme script's hash is SHA-256 in base64", async () => {
    expect(await scriptHash("alert(1)")).toBe(
      "'sha256-bhHHL3z2vDgxUt0W3dWQOrprscmda2Y5pLsLg4GF+pI='"
    );
  });
});
