import { describe, expect, test } from "vitest";
import {
  gapKey,
  joinsFor,
  lineProblem,
  namesInLine,
  partsFromLine,
  tidyEnglishName,
  wordsInLine,
} from "./names";

describe("one line of four names", () => {
  test("English is capitalized, and hyphens stay inside a word", () => {
    expect(tidyEnglishName("ali  abdul - rahman HASAN najm")).toBe(
      "Ali Abdul-Rahman Hasan Najm"
    );
    expect(lineProblem("Ali Abdul-Rahman Hasan Najm", "en")).toBeNull();
  });

  test("a name of two words with a space is joined by a tap", () => {
    const line = "Mohammed Ali Kareem Hasan Najm";
    expect(lineProblem(line, "en")).toBe("tooMany");
    const words = wordsInLine(line);
    const joins = joinsFor(line, "en", new Map([[gapKey(words, 0), true]]));
    expect(lineProblem(line, "en", joins)).toBeNull();
    expect(partsFromLine(line, "en", joins)).toEqual({
      father: "Kareem",
      first: "Mohammed Ali",
      grandfather: "Hasan",
      last: "Najm",
    });
  });

  test("English refuses numbers, symbols, small letters and too few names", () => {
    expect(lineProblem("Ali Kareem Hasan Najm2", "en")).toBe("letters");
    expect(lineProblem("Ali Kareem Hasan O'Najm", "en")).toBe("letters");
    expect(lineProblem("Ali kareem Hasan Najm", "en")).toBe("capitals");
    expect(lineProblem("Ali Kareem Hasan", "en")).toBe("count");
  });

  test("Arabic comes with «أبو» and «عبد» joined, and a tap can undo it", () => {
    const line = "علي أبو بكر حسن عبد الله";
    expect(namesInLine(line, "ar")).toEqual([
      "علي",
      "أبو بكر",
      "حسن",
      "عبد الله",
    ]);
    const words = wordsInLine(line);
    const undone = joinsFor(line, "ar", new Map([[gapKey(words, 1), false]]));
    expect(lineProblem(line, "ar", undone)).toBe("tooMany");
    expect(lineProblem("علي عبدالله حسن الجبوري", "ar")).toBeNull();
    expect(lineProblem("علي عبدالله حسن", "ar")).toBe("count");
    expect(lineProblem("علي عبدالله حسن 4", "ar")).toBe("letters");
    expect(lineProblem("Ali عبدالله حسن الجبوري", "ar")).toBe("letters");
  });
});
