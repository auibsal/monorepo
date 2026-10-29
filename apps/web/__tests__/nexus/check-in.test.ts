import { describe, expect, test } from "vitest";
import { parseScan } from "@/components/nexus/admin/events/check-in";

describe("check-in scans", () => {
  test("reads a ticket QR", () => {
    expect(parseScan("sal:ticket:0123456789abcdef01234567")).toEqual({
      ticket_code: "0123456789abcdef01234567",
    });
  });

  test("reads a membership card QR, a link in either language", () => {
    for (const value of [
      "https://auibsal.org/verify/member/0123456789abcdef0123?t=94287082",
      "https://auibsal.org/ar/verify/member/0123456789abcdef0123?t=94287082",
    ]) {
      expect(parseScan(value), value).toEqual({
        card_code: "0123456789abcdef0123",
        digits: "94287082",
      });
    }
    // Without its live digits the door still reads it, then refuses it.
    expect(
      parseScan("https://auibsal.org/verify/member/0123456789abcdef0123")
    ).toEqual({ card_code: "0123456789abcdef0123", digits: "" });
  });

  test("ignores anything else", () => {
    for (const value of [
      "https://example.com",
      "sal:ticket:nothex",
      "sal:ticket:0123456789abcdef0123456789",
      "sal:member:0b6f6d5e-1f2a-4c3b-9d8e-7f6a5b4c3d2e",
      "https://auibsal.org/verify/member/short",
      "https://auibsal.org/verify/0123456789abcdef0123",
    ]) {
      expect(parseScan(value), value).toBeNull();
    }
  });
});
