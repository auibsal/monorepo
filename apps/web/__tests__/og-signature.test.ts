// @vitest-environment node
import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/env", () => ({ env: { CRON_SECRET: "x".repeat(32) } }));

const { isSignedOgTitle, signOgTitle } = await import("@/lib/og-signature");

describe("share images draw only the site's titles", () => {
  test("a title signed for its language is drawn", () => {
    const sig = signOgTitle("en", "Writing workshop");
    expect(sig).toHaveLength(22);
    expect(isSignedOgTitle("en", "Writing workshop", sig)).toBe(true);
  });

  test("another title, another language or no signature is refused", () => {
    const sig = signOgTitle("en", "Writing workshop");
    expect(isSignedOgTitle("en", "Something else", sig)).toBe(false);
    expect(isSignedOgTitle("ar", "Writing workshop", sig)).toBe(false);
    expect(isSignedOgTitle("en", "Writing workshop", null)).toBe(false);
  });
});
