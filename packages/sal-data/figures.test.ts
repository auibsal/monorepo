import { describe, expect, it } from "vitest";
import { parseFigureRows } from "./journal";
import { splitAtFigures } from "./sanitize";

describe("an explainer's figures", () => {
  it("reads the editor's lines", () => {
    expect(
      parseFigureRows("Fall | الخريف | 120\nSpring | الربيع | 80,5\n")
    ).toEqual([
      { label_ar: "الخريف", label_en: "Fall", value: 120 },
      { label_ar: "الربيع", label_en: "Spring", value: 80.5 },
    ]);
    expect(parseFigureRows("Fall | 3")).toEqual([
      { label_en: "Fall", value: 3 },
    ]);
  });

  it("refuses a line without a number, and no lines", () => {
    expect(parseFigureRows("Fall | many")).toBeNull();
    expect(parseFigureRows("  \n")).toBeNull();
    expect(
      parseFigureRows(Array.from({ length: 25 }, () => "x | 1").join("\n"))
    ).toBeNull();
  });

  it("places a figure where the text names it", () => {
    expect(
      splitAtFigures("<p>Before.</p><p>[figure 2]</p><p>After.</p>")
    ).toEqual([
      { html: "<p>Before.</p>" },
      { figure: 2 },
      { html: "<p>After.</p>" },
    ]);
    expect(splitAtFigures('<p dir="rtl">[شكل 1]</p>')).toEqual([{ figure: 1 }]);
    expect(splitAtFigures("<p>See figure 2 below.</p>")).toEqual([
      { html: "<p>See figure 2 below.</p>" },
    ]);
  });
});
