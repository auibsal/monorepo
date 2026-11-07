import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { walletCardFrom } = await import("@/lib/api/wallet");

const row = {
  code: "0123456789abcdef0123",
  full_name_ar: "لينا حسن",
  full_name_en: "Lina Hassan",
  kind: "member",
  locale: "en",
  number: 42,
  role_ar: "رئيس التحرير",
  role_en: "Editor-in-Chief",
  secret: "00",
  since: 2026,
  tier: "associate",
};

describe("walletCardFrom", () => {
  it("carries the card's fields in the holder's language (decisions §11)", () => {
    expect(walletCardFrom(row)).toMatchObject({
      fullName: "Lina Hassan",
      locale: "en",
      number: 42,
      role: "Editor-in-Chief",
      since: 2026,
      tier: "Associate Member",
    });
    expect(walletCardFrom({ ...row, locale: "ar" })).toMatchObject({
      fullName: "لينا حسن",
      role: "رئيس التحرير",
      tier: "عضو منتسب",
    });
  });

  it("says Guest on a guest's pass, with no second line without a role", () => {
    expect(
      walletCardFrom({
        ...row,
        kind: "guest",
        role_ar: null,
        role_en: null,
        tier: null,
      })
    ).toMatchObject({ role: null, tier: "Guest" });
  });
});
