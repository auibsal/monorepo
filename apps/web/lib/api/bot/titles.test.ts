import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { adminHere, shortTitle } = await import("./titles");

describe("a seat as a Telegram title (16 characters at most)", () => {
  test("a short seat stays whole", () => {
    expect(shortTitle("President")).toBe("President");
    expect(shortTitle("Editor-in-Chief")).toBe("Editor-in-Chief");
  });

  test("a long seat is cut at a word", () => {
    expect(shortTitle("Director of Partnerships")).toBe("Director");
    expect(shortTitle("Director of Partnerships").length).toBeLessThanOrEqual(
      16
    );
  });

  test("a single long word is cut at 16", () => {
    expect(shortTitle("Supercalifragilistic")).toHaveLength(16);
  });
});

describe("who Hudhud makes an admin", () => {
  const holder = (officer: boolean, council: boolean) => ({
    council,
    officer,
    telegram_id: 1,
    title_ar: "",
    title_en: "",
  });
  const members = { audience: "members" as const };
  const staff = { audience: "staff" as const };

  test("the four officers in both groups", () => {
    expect(adminHere(members, holder(true, true))).toBe(true);
    expect(adminHere(staff, holder(true, true))).toBe(true);
  });

  test("other Council seats in the Diwan group only", () => {
    expect(adminHere(members, holder(false, true))).toBe(false);
    expect(adminHere(staff, holder(false, true))).toBe(true);
  });

  test("other role holders carry a tag", () => {
    expect(adminHere(staff, holder(false, false))).toBe(false);
  });
});
