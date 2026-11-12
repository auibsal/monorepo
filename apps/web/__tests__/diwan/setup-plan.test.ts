import { describe, expect, test } from "vitest";
import { planSetup } from "@/components/diwan/setup-form";

const blank = { father: "", first: "", grandfather: "", last: "" };
const none = { ar: blank, en: blank };
const all = {
  ar: { father: "كريم", first: "لينا", grandfather: "حسن", last: "التميمي" },
  en: { father: "Kareem", first: "Lina", grandfather: "Hasan", last: "Tamimi" },
};

describe("setup, one question per screen", () => {
  test("a new member: both names, the Code of Conduct, photos, then welcome", () => {
    expect(
      planSetup({
        names: none,
        pending: ["member"],
        setupDone: false,
      })
    ).toEqual({
      steps: [
        { kind: "nameEn" },
        { kind: "nameAr" },
        { kind: "pledge", pledge: "member" },
        { kind: "photos" },
      ],
      welcome: true,
    });
  });

  test("names given at sign-up are not asked again", () => {
    expect(
      planSetup({ names: all, pending: ["member"], setupDone: false }).steps
    ).toEqual([{ kind: "pledge", pledge: "member" }, { kind: "photos" }]);
  });

  test("a renewed pledge asks only the pledge, with no welcome", () => {
    expect(
      planSetup({ names: all, pending: ["member"], setupDone: true })
    ).toEqual({
      steps: [{ kind: "pledge", pledge: "member" }],
      welcome: false,
    });
  });

  test("a part missing in one language asks that language again", () => {
    expect(
      planSetup({
        names: { ...all, ar: { ...all.ar, grandfather: " " } },
        pending: [],
        setupDone: true,
      }).steps
    ).toEqual([{ kind: "nameAr" }]);
  });

  test("a partner's representative who is not a member gives names only", () => {
    expect(
      planSetup({
        member: false,
        names: none,
        pending: ["member"],
        setupDone: false,
      })
    ).toEqual({
      steps: [{ kind: "nameEn" }, { kind: "nameAr" }],
      welcome: false,
    });
  });
});

describe("how a member's name appears", () => {
  // No "keep or change" step (fourth prompt, 3a): the default shows until
  // the member chooses a preferred name in Settings.
  test("a member whose names are complete is not asked about them", () => {
    expect(
      planSetup({
        names: {
          ar: { father: "ب", first: "أ", grandfather: "ج", last: "" },
          en: { father: "B", first: "A", grandfather: "C", last: "" },
        },
        pending: [],
        setupDone: true,
      }).steps
    ).toEqual([]);
  });
});
