import { describe, expect, it } from "vitest";
import { logoScale } from "./lib/logo-scale";

describe("partner logos at equal weight", () => {
  it("lets a square logo fill its box", () => {
    expect(logoScale(400, 400)).toBe(1);
  });

  it("stands a 4:1 wordmark at half the box, twice as wide", () => {
    const scale = logoScale(800, 200);
    expect(scale).toBeCloseTo(0.5);
    // Its width at that height is twice the box: the same area as a square.
    expect((800 / 200) * scale).toBeCloseTo(2);
  });

  it("never lets a tall logo pass the box", () => {
    expect(logoScale(200, 600)).toBe(1);
  });

  it("falls back to the box for a logo without its size", () => {
    expect(logoScale(0, 0)).toBe(1);
  });
});
