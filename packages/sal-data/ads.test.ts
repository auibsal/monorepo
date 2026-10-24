import { describe, expect, test } from "vitest";
import { adForSlot, adInputSchema } from "./ads";

const base = {
  action_ar: null,
  action_en: "Join",
  body_ar: null,
  body_en: "",
  ends_on: null,
  headline_ar: "",
  headline_en: "Join the Society",
  image_alt_ar: null,
  image_alt_en: null,
  image_path: null,
  is_published: true,
  kind: "society" as const,
  partner_id: null,
  starts_on: "2026-10-16",
  url: "/join",
};

describe("an ad as written in the Nexus", () => {
  test("a Society ad", () => {
    const ad = adInputSchema.parse(base);
    expect(ad.body_en).toBeNull();
  });

  test("a sponsor ad names its partner, and a Society ad none", () => {
    expect(adInputSchema.safeParse({ ...base, kind: "sponsor" }).success).toBe(
      false
    );
    expect(
      adInputSchema.safeParse({
        ...base,
        partner_id: "00000000-0000-4000-8000-000000000001",
      }).success
    ).toBe(false);
    expect(
      adInputSchema.safeParse({
        ...base,
        kind: "sponsor",
        partner_id: "00000000-0000-4000-8000-000000000001",
        url: "https://example.com",
      }).success
    ).toBe(true);
  });

  test("links go to auibsal.org or https", () => {
    expect(
      adInputSchema.safeParse({ ...base, url: "http://x.com" }).success
    ).toBe(false);
    expect(
      adInputSchema.safeParse({ ...base, url: "javascript:alert(1)" }).success
    ).toBe(false);
  });

  test("needs a headline, sensible dates, and alt text for an image", () => {
    expect(adInputSchema.safeParse({ ...base, headline_en: " " }).success).toBe(
      false
    );
    expect(
      adInputSchema.safeParse({ ...base, ends_on: "2026-10-01" }).success
    ).toBe(false);
    expect(
      adInputSchema.safeParse({ ...base, image_path: "ads/a.png" }).success
    ).toBe(false);
  });
});

describe("which ad a slot shows", () => {
  test("none when nothing is running", () => {
    expect(adForSlot([], "/qirtas", 0)).toBeNull();
  });

  test("slots on a page take turns, the same way every time", () => {
    const ads = ["a", "b", "c"];
    const first = adForSlot(ads, "/qirtas/pieces/x", 0);
    expect(adForSlot(ads, "/qirtas/pieces/x", 0)).toBe(first);
    expect(adForSlot(ads, "/qirtas/pieces/x", 1)).not.toBe(first);
    expect(new Set([0, 1, 2].map((i) => adForSlot(ads, "/p", i))).size).toBe(3);
  });
});
