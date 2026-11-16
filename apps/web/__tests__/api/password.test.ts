import { afterEach, describe, expect, it, vi } from "vitest";
import { breachedIn, isBreachedPassword } from "@/lib/password";

describe("the breached-password check", () => {
  const range =
    "0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n00D4F6E8FA6EECAD2A3AA415EEC418D38EC:0\r\n";
  it("finds a suffix that was breached", () => {
    expect(breachedIn(range, "0018A45C4D1DEF81644B54AB7F969B88D65")).toBe(true);
  });
  it("ignores padding (a count of 0) and anything not listed", () => {
    expect(breachedIn(range, "00D4F6E8FA6EECAD2A3AA415EEC418D38EC")).toBe(
      false
    );
    expect(breachedIn(range, "FFFF")).toBe(false);
  });
});

// SHA-1 of "password": only its first five characters leave the browser.
const PREFIX = "5BAA6";
const SUFFIX = "1E4C9B93F3F0682250B6CF8331B7EE68FD8";

describe("checking a password from the browser", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends only the prefix and finds the suffix in the answer", async () => {
    const fetch = vi.fn(
      async (_url: string) => new Response(`${SUFFIX}:9545824\r\n`)
    );
    vi.stubGlobal("fetch", fetch);
    expect(await isBreachedPassword("password")).toBe(true);
    expect(String(fetch.mock.calls[0]?.[0])).toBe(
      `/api/password-check?prefix=${PREFIX}`
    );
  });

  it("never blocks when the check can't be made", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 429 }))
    );
    expect(await isBreachedPassword("password")).toBe(false);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await isBreachedPassword("password")).toBe(false);
  });
});
