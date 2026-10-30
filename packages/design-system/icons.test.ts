import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { iconData } from "./components/sal/icon-data";
import { iconDataPath, renderIconData } from "./scripts/icons";

describe("the icon set", () => {
  test("icon-data.ts is generated from brand/icons", async () => {
    expect(readFileSync(iconDataPath, "utf8")).toBe(await renderIconData());
  });

  test("54 icons, each drawn with at least one shape", () => {
    const names = Object.keys(iconData);
    expect(names).toHaveLength(54);
    for (const name of names) {
      expect(
        iconData[name as keyof typeof iconData].length,
        name
      ).toBeGreaterThan(0);
    }
  });

  test("every shape keeps its attributes (x1, y2 and the rest)", () => {
    for (const [name, shapes] of Object.entries(iconData)) {
      for (const [tag, attributes] of shapes) {
        expect(
          Object.keys(attributes).length,
          `${name} ${tag}`
        ).toBeGreaterThan(0);
      }
    }
  });
});
