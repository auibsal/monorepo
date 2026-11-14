import { describe, expect, test } from "vitest";
import {
  lineProblem,
  namesInLine,
  partsFromLine,
  tidyEnglishName,
} from "./names";

describe("one line of four names", () => {
  test("English is capitalized and a two-word name joined by a hyphen", () => {
    expect(tidyEnglishName("ali  abdul - rahman HASAN najm")).toBe(
      "Ali Abdul-Rahman Hasan Najm"
    );
    expect(lineProblem("Ali Abdul-Rahman Hasan Najm", "en")).toBeNull();
    expect(partsFromLine("Ali Abdul-Rahman Hasan Najm", "en")).toEqual({
      father: "Abdul-Rahman",
      first: "Ali",
      grandfather: "Hasan",
      last: "Najm",
    });
  });

  test("English refuses numbers, symbols, small letters and a count not four", () => {
    expect(lineProblem("Ali Kareem Hasan Najm2", "en")).toBe("letters");
    expect(lineProblem("Ali Kareem Hasan O'Najm", "en")).toBe("letters");
    expect(lineProblem("Ali kareem Hasan Najm", "en")).toBe("capitals");
    expect(lineProblem("Ali Kareem Hasan", "en")).toBe("count");
    expect(lineProblem("Ali Kareem Hasan Najm Jaber", "en")).toBe("count");
  });

  test("Arabic reads «أبو» and «عبد» with the next word as one name", () => {
    expect(namesInLine("علي أبو بكر حسن عبد الله", "ar")).toEqual([
      "علي",
      "أبو بكر",
      "حسن",
      "عبد الله",
    ]);
    expect(lineProblem("علي عبدالله حسن الجبوري", "ar")).toBeNull();
    expect(lineProblem("علي عبدالله حسن", "ar")).toBe("count");
    expect(lineProblem("علي عبدالله حسن 4", "ar")).toBe("letters");
    expect(lineProblem("Ali عبدالله حسن الجبوري", "ar")).toBe("letters");
  });
});
