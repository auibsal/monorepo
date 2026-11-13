import { describe, expect, test } from "vitest";
import {
  displayName,
  hasFourPartNames,
  inScript,
  nameColumns,
  partsFrom,
  partsUpdate,
} from "./names";

describe("four-part names", () => {
  test("eight columns, four in each language", () => {
    expect(nameColumns).toEqual([
      "first_name_en",
      "father_name_en",
      "grandfather_name_en",
      "last_name_en",
      "first_name_ar",
      "father_name_ar",
      "grandfather_name_ar",
      "last_name_ar",
    ]);
  });

  test("the default name shown is the given and father's names", () => {
    expect(
      displayName({
        father: "Kareem",
        first: "Lina",
        grandfather: "Hasan",
        last: "Al-Tamimi",
      })
    ).toBe("Lina Kareem");
  });

  test("each language in its own script", () => {
    expect(inScript("Mohammed-Ali O’Hara", "en")).toBe(true);
    expect(inScript("محمد", "en")).toBe(false);
    expect(inScript("عبد الله", "ar")).toBe(true);
    expect(inScript("Omar", "ar")).toBe(false);
    expect(inScript("4", "ar")).toBe(false);
    expect(inScript("", "ar")).toBe(true);
  });

  test("a name kept whole offers its first and last words", () => {
    expect(partsFrom({ full_name_en: "Lina K. Al-Tamimi" }, "en")).toEqual({
      father: "",
      first: "Lina",
      grandfather: "",
      last: "Al-Tamimi",
    });
    expect(partsFrom({ full_name_ar: null }, "ar").first).toBe("");
  });

  test("all eight parts are needed", () => {
    const one = {
      father_name_en: "B",
      first_name_en: "A",
      grandfather_name_en: "C",
      last_name_en: "D",
    };
    expect(hasFourPartNames(one)).toBe(false);
    expect(
      hasFourPartNames({
        ...one,
        father_name_ar: "ب",
        first_name_ar: "أ",
        grandfather_name_ar: "ج",
        last_name_ar: "د",
      })
    ).toBe(true);
  });

  test("an update trims each part", () => {
    expect(
      partsUpdate(
        { father: " B ", first: "A", grandfather: "C", last: "D " },
        "en"
      )
    ).toEqual({
      father_name_en: "B",
      first_name_en: "A",
      grandfather_name_en: "C",
      last_name_en: "D",
    });
  });

  test("an update leaves out the parts on record", () => {
    expect(
      partsUpdate(
        { father: "B", first: "A", grandfather: "C", last: "" },
        "en",
        ["grandfather"]
      )
    ).toEqual({
      father_name_en: "B",
      first_name_en: "A",
      last_name_en: null,
    });
  });
});
