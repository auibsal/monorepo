import { membership } from "@repo/sal-data";
import { describe, expect, test } from "vitest";
import {
  detailsThin,
  moreSteps,
} from "@/components/nexus/profile/tell-us-more";
import { planSetup } from "@/components/nexus/setup-form";

const blank = { father: "", first: "", grandfather: "", last: "" };
const none = { ar: blank, en: blank };
const all = {
  ar: { father: "كريم", first: "لينا", grandfather: "حسن", last: "التميمي" },
  en: { father: "Kareem", first: "Lina", grandfather: "Hasan", last: "Tamimi" },
};

describe("setup, one question per screen", () => {
  test("a new member: both names, each pledge, photos, then welcome", () => {
    expect(
      planSetup({
        names: none,
        pending: ["human_authorship", "member"],
        setupDone: false,
      })
    ).toEqual({
      steps: [
        { kind: "nameEn" },
        { kind: "nameAr" },
        { kind: "pledge", pledge: "human_authorship" },
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

describe("Tell us more", () => {
  test("study is asked only of AUIB students and graduates", () => {
    const base = membership.emptyDetails;
    expect(moreSteps(base)).not.toContain("study");
    expect(moreSteps({ ...base, affiliation: "student" })).toContain("study");
    expect(moreSteps({ ...base, affiliation: "alumni" })).toContain("study");
    expect(moreSteps({ ...base, affiliation: "staff" })).not.toContain("study");
  });

  test("Today offers it until there are interests or skills", () => {
    expect(detailsThin(membership.emptyDetails)).toBe(true);
    expect(
      detailsThin({ ...membership.emptyDetails, skills: ["writing"] })
    ).toBe(false);
  });
});
