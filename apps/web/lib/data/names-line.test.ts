import { describe, expect, test } from "vitest";
import { tidyEnglishName, typedName } from "./names";

describe("the name typed at sign-up", () => {
  test("English is capitalized, and hyphens stay inside a word", () => {
    expect(tidyEnglishName("ali  abdul - rahman HASAN najm")).toBe(
      "Ali Abdul-Rahman Hasan Najm"
    );
  });

  test("keeps the line to Latin letters", () => {
    expect(typedName("Ali شاهين 3 O'Neil", "en")).toBe("Ali ONeil");
    expect(typedName("شاهين Ali ٣ كرم،", "ar")).toBe("شاهين كرم");
  });

  test("keeps one hyphen in both languages", () => {
    expect(typedName("Abdul--Rahman", "en")).toBe("Abdul-Rahman");
    expect(typedName("عبد--الله", "ar")).toBe("عبد-الله");
  });
});
