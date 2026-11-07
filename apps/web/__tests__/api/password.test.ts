import { describe, expect, it } from "vitest";
import { breachedIn } from "@/lib/password";

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
