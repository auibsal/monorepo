import { describe, expect, test } from "vitest";
import { planSetup } from "@/components/diwan/setup-form";

const blank = { father: "", first: "", grandfather: "", last: "" };
const none = { ar: blank, en: blank };
const all = {
  ar: { father: "كريم", first: "لينا", grandfather: "حسن", last: "التميمي" },
  en: { father: "Kareem", first: "Lina", grandfather: "Hasan", last: "Tamimi" },
};

describe("setup, in three screens at most (with sign-up's own)", () => {
  test("a new member: both names on one screen, the Code of Conduct, then welcome", () => {
    expect(
      planSetup({
        names: none,
        pending: ["member"],
        setupDone: false,
      })
    ).toEqual({
      steps: [
        { kind: "names", languages: ["en", "ar"] },
        { kind: "pledge", pledge: "member" },
      ],
      welcome: true,
    });
  });

  test("names given at sign-up are not asked again", () => {
    expect(
      planSetup({ names: all, pending: ["member"], setupDone: false }).steps
    ).toEqual([{ kind: "pledge", pledge: "member" }]);
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
    ).toEqual([{ kind: "names", languages: ["ar"] }]);
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
      steps: [{ kind: "names", languages: ["en", "ar"] }],
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
