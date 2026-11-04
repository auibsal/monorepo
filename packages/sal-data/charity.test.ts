import { describe, expect, it } from "vitest";
import { campaignStages, dropOffPoints, type StageFields } from "./charity";

const dates: StageFields = {
  boxes_on: "2026-10-29",
  donations_ends_on: "2026-11-05",
  donations_starts_on: "2026-11-01",
  fair_ends_on: "2026-11-11",
  fair_starts_on: "2026-11-08",
  handed_over_on: null,
  handover_due_on: "2026-11-15",
  impact_due_on: "2026-12-20",
};
const states = (fields: StageFields, today: string, impact = false) =>
  campaignStages(fields, today, impact).map((s) => s.state);

describe("Second Chapter's stages", () => {
  it("follows the days", () => {
    expect(states(dates, "2026-10-20")).toEqual([
      "ahead",
      "ahead",
      "ahead",
      "ahead",
      "ahead",
    ]);
    expect(states(dates, "2026-11-04")).toEqual([
      "done",
      "now",
      "ahead",
      "ahead",
      "ahead",
    ]);
    expect(states(dates, "2026-11-11")[2]).toBe("now");
  });

  it("never marks the handover or the report done by date alone", () => {
    expect(states(dates, "2027-01-10")).toEqual([
      "done",
      "done",
      "done",
      "now",
      "now",
    ]);
  });

  it("closes earlier stages once the handover is recorded", () => {
    expect(
      states({ ...dates, handed_over_on: "2026-11-15" }, "2026-11-02", true)
    ).toEqual(["done", "done", "done", "done", "done"]);
  });

  it("leaves undated stages ahead", () => {
    const none = Object.fromEntries(
      Object.keys(dates).map((k) => [k, null])
    ) as unknown as StageFields;
    expect(new Set(states(none, "2026-11-04"))).toEqual(new Set(["ahead"]));
  });

  it("reads only well-formed drop-off points", () => {
    expect(
      dropOffPoints([{ place_ar: "المكتبة", place_en: "Library" }, { x: 1 }])
    ).toHaveLength(1);
    expect(dropOffPoints(null)).toEqual([]);
  });
});
