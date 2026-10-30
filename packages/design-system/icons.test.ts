import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { iconData } from "./components/sal/icon-data";
import { iconDataPath, renderIconData } from "./scripts/icons";

describe("the icon set", () => {
  test("icon-data.ts is generated from brand/icons", async () => {
    expect(readFileSync(iconDataPath, "utf8")).toBe(await renderIconData());
  });

  test("44 icons, each drawn with at least one shape", () => {
    const names = Object.keys(iconData);
    expect(names).toHaveLength(44);
    for (const name of names) {
      expect(
        iconData[name as keyof typeof iconData].length,
        name
      ).toBeGreaterThan(0);
    }
  });
});
