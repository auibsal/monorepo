import { membership } from "@repo/sal-data";
import { describe, expect, test } from "vitest";
import {
  detailsThin,
  moreSteps,
} from "@/components/nexus/profile/tell-us-more";
import { planSetup } from "@/components/nexus/setup-form";

const none = { familyAr: "", familyEn: "", givenAr: "", givenEn: "" };
const all = {
  familyAr: "فرجو",
  familyEn: "Farjo",
  givenAr: "شاهين",
  givenEn: "Shaheen",
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

  test("a missing half of a name asks that language again", () => {
    expect(
      planSetup({
        names: { ...all, familyAr: " " },
        pending: [],
        setupDone: true,
      }).steps
    ).toEqual([{ kind: "nameAr" }]);
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
