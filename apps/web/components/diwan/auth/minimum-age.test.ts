import { describe, expect, it } from "vitest";
import { underMinimumAge } from "./sign-up-form";

const NOV_16 = new Date(Date.UTC(2026, 10, 16));
const born = (month: number, year: number) => ({
  month: String(month),
  parent: "",
  year: String(year),
});

describe("the minimum age of 13 (decisions.md, Members: minors)", () => {
  it("counts the 13th birthday from the end of the birth month", () => {
    expect(underMinimumAge(born(11, 2013), NOV_16)).toBe(true);
    expect(underMinimumAge(born(10, 2013), NOV_16)).toBe(false);
    expect(underMinimumAge(born(12, 2012), NOV_16)).toBe(false);
  });

  it("refuses a child", () => {
    expect(underMinimumAge(born(1, 2016), NOV_16)).toBe(true);
  });

  it("waits for both the month and a four-digit year", () => {
    expect(underMinimumAge({ month: "", parent: "", year: "2016" })).toBe(
      false
    );
    expect(underMinimumAge({ month: "3", parent: "", year: "201" })).toBe(
      false
    );
  });
});
