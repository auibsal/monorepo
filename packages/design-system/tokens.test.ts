import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { logoFiles } from "./brand/logos";
import {
  type BrandTokens,
  brandTokensPath,
  renderBrandTokens,
  renderTokens,
  splitColors,
} from "./scripts/tokens";

const tokens = JSON.parse(readFileSync(brandTokensPath, "utf8")) as BrandTokens;
const { palette, roles } = splitColors(tokens);

const hex = (theme: "light" | "dark", role: string) => {
  const value = roles[role]?.[theme] ?? "";
  return palette[value.slice(1, -1)] ?? "";
};

const luminance = (color: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(color.slice(i, i + 2), 16) / 255;
    return c <= 0.039_28 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
};

const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
};

/**
 * Every text pair the v6 roles allow, in both modes (brand/tokens.json,
 * "Color roles"): text and secondary text on the page and on Qirtas's
 * reading ground, the accent as text, text on the accent button and on the
 * band. Rules (`line`) carry no words and are not checked.
 */
const textPairs: [string, string][] = [
  ["text", "surface"],
  ["text", "surface-reading"],
  ["text-secondary", "surface"],
  ["text-secondary", "surface-reading"],
  ["accent", "surface"],
  ["accent", "surface-reading"],
  ["on-accent", "accent"],
  ["on-band", "band"],
];

/** Fixed pairs outside the roles: the footer is ink, with white text, in both modes. */
const fixedPairs: [string, string][] = [
  ["white", "ink"],
  ["crimson-100", "ink"],
  ["mist", "ink"],
  ["crimson-100", "crimson"],
  ["ash", "paper"],
];

describe("SAL tokens (brand/tokens.json)", () => {
  test("the palette is the brand's six colors and four reserved tones", () => {
    expect(Object.keys(palette).sort()).toEqual(
      [
        "ash",
        "crimson",
        "crimson-100",
        "crimson-700",
        "ink",
        "mist",
        "paper",
        "slate",
        "stone",
        "white",
      ].sort()
    );
  });

  test("the roles are v6's ten", () => {
    expect(Object.keys(roles).sort()).toEqual(
      [
        "accent",
        "band",
        "footer",
        "line",
        "on-accent",
        "on-band",
        "surface",
        "surface-reading",
        "text",
        "text-secondary",
      ].sort()
    );
  });

  test("every role references a palette color in both themes", () => {
    for (const [role, value] of Object.entries(roles)) {
      for (const theme of ["light", "dark"] as const) {
        expect(palette, `${theme}.${role}`).toHaveProperty(
          value[theme].slice(1, -1)
        );
      }
    }
  });

  test("crimson never sits on ink as text or accent", () => {
    expect(hex("dark", "surface")).toBe(palette.ink);
    for (const role of ["text", "text-secondary", "accent"]) {
      expect(hex("dark", role)).not.toBe(palette.crimson);
    }
  });

  for (const theme of ["light", "dark"] as const) {
    test(`text pairs reach 4.5:1 (${theme})`, () => {
      for (const [fg, bg] of textPairs) {
        expect(
          ratio(hex(theme, fg), hex(theme, bg)),
          `${fg} on ${bg}`
        ).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  test("the brand's fixed pairs reach 4.5:1", () => {
    for (const [fg, bg] of fixedPairs) {
      expect(
        ratio(palette[fg] ?? "", palette[bg] ?? ""),
        `${fg} on ${bg}`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("no retired token is emitted", () => {
    const css = renderTokens(tokens) + renderBrandTokens(tokens);
    for (const retired of [
      "crimson-50",
      "ink-70",
      "ink-50",
      "--rule:",
      "--sal-rule:",
      "surface-tint",
      "text-meta",
      "--title",
      "accent-line",
      "--frame:",
      "--offset:",
      "radius-card",
      "radius-swatch",
      "radius-key",
    ]) {
      expect(css).not.toContain(retired);
    }
  });

  test("tokens.css files are generated from brand/tokens.json", () => {
    expect(
      readFileSync(join(import.meta.dirname, "styles", "tokens.css"), "utf8")
    ).toBe(renderTokens(tokens));
    expect(
      readFileSync(join(brandTokensPath, "..", "tokens.css"), "utf8")
    ).toBe(renderBrandTokens(tokens));
  });

  test("the self-hosted Ubuntu Arabic files are the brand's own", () => {
    for (const file of [
      "UbuntuArabic-Regular.woff2",
      "UbuntuArabic-Bold.woff2",
    ]) {
      const ours = readFileSync(join(import.meta.dirname, "fonts", file));
      const brand = readFileSync(join(brandTokensPath, "..", "fonts", file));
      expect(ours.equals(brand), file).toBe(true);
    }
  });
});

describe("SAL logos (brand/logos)", () => {
  const brandDir = join(brandTokensPath, "..", "logos");
  for (const app of ["web"]) {
    test(`apps/${app}/public/brand holds the brand's files unchanged`, () => {
      for (const file of logoFiles) {
        const ours = readFileSync(
          join(
            import.meta.dirname,
            "..",
            "..",
            "apps",
            app,
            "public",
            "brand",
            file
          )
        );
        expect(ours.equals(readFileSync(join(brandDir, file))), file).toBe(
          true
        );
      }
    });
  }

  for (const app of ["web"]) {
    test(`apps/${app}/app/icon.svg is the brand's avatar`, () => {
      const icon = readFileSync(
        join(import.meta.dirname, "..", "..", "apps", app, "app", "icon.svg")
      );
      expect(icon.equals(readFileSync(join(brandDir, "sal-avatar.svg")))).toBe(
        true
      );
    });
  }
});
