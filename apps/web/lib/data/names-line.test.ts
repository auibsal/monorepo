import { describe, expect, test } from "vitest";
import {
  gapKey,
  joinsFor,
  lineProblem,
  namesInLine,
  partsFromLine,
  roomForNames,
  tidyEnglishName,
  typedName,
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

describe("typing a name line", () => {
  test("keeps each line to its own script", () => {
    expect(typedName("Ali شاهين 3 O'Neil", "en")).toBe("Ali ONeil");
    expect(typedName("شاهين Ali ٣ كرم،", "ar")).toBe("شاهين كرم");
  });

  test("keeps one hyphen in both languages", () => {
    expect(typedName("Abdul--Rahman", "en")).toBe("Abdul-Rahman");
    expect(typedName("عبد--الله", "ar")).toBe("عبد-الله");
  });

  test("refuses a fifth name, unless two words are joined", () => {
    const none = new Map<string, boolean>();
    expect(roomForNames("Ali Kareem Hassan Saad", "en", none)).toBe(true);
    expect(roomForNames("Ali Kareem Hassan Saad ", "en", none)).toBe(false);
    const joined = new Map([[gapKey(["Mohammed", "Ali"], 0), true]]);
    expect(roomForNames("Mohammed Ali Kareem Hassan Saad", "en", joined)).toBe(
      true
    );
  });

  test("lets «عبد» take the next word as the fourth name", () => {
    expect(roomForNames("شاهين كرم موفق عبد ", "ar", new Map())).toBe(true);
  });
});

test("a join survives the capitals added when the field is left", () => {
  const typed = wordsInLine("new mohammed ali kareem");
  const choices = new Map([[gapKey(typed, 1), true]]);
  expect(roomForNames("New Mohammed Ali Kareem ", "en", choices)).toBe(true);
});

test("an Arabic name joined by a hyphen is one name", () => {
  expect(lineProblem("شاهين كرم عبد-الرحمن فرجو", "ar")).toBeNull();
});
