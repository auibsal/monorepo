import { describe, expect, test } from "vitest";
import { MOVED } from "./moved";

const PARAM = /:[a-z]+(\([^)]*\))?\*?/gu;
const SOME_TEXT = /\S/u;

describe("lasting addresses", () => {
  test("every redirect keeps its reason", () => {
    for (const [from, , reason] of MOVED) {
      expect(reason, from).toMatch(SOME_TEXT);
    }
  });
  test("each old address is listed once", () => {
    const froms = MOVED.map(([from]) => from);
    expect(new Set(froms).size).toBe(froms.length);
  });
  test("no redirect lands on another redirect", () => {
    const sources = MOVED.map(([from]) => from.replace(PARAM, ":x"));
    for (const [, to] of MOVED) {
      const path = to.split("?")[0]?.replace(PARAM, ":x") ?? "";
      expect(sources, to).not.toContain(path);
    }
  });
  test("addresses never shared are not kept", () => {
    const froms = MOVED.map(([from]) => from);
    for (const gone of [
      "/diwan/society",
      "/diwan/people",
      "/account/card",
      "/account/saved",
      "/welcome",
      "/sign-up/guest",
      "/partners/dashboard/people",
    ]) {
      expect(froms).not.toContain(gone);
    }
  });
});
