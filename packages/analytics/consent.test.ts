import { describe, expect, test, vi } from "vitest";
import { hasChoice, knownPurposes, saveChoice } from "./consent";

describe("has the visitor answered", () => {
  test("not before Zaraz has stored a choice", () => {
    expect(hasChoice("", "aNaL")).toBe(false);
    expect(hasChoice("NEXT_LOCALE=en; cf_clearance=abc", "aNaL")).toBe(false);
  });

  test("yes, whether they allowed or declined", () => {
    expect(hasChoice('zaraz-consent={"aNaL":false}', "aNaL")).toBe(true);
    expect(hasChoice('NEXT_LOCALE=ar; cf_consent={"aNaL":true}', "aNaL")).toBe(
      true
    );
  });

  test("reads an encoded cookie", () => {
    expect(hasChoice(`x=${encodeURIComponent('{"aNaL":true}')}`, "aNaL")).toBe(
      true
    );
  });

  test("ignores other purposes and broken values", () => {
    expect(hasChoice('zaraz-consent={"other":true}', "aNaL")).toBe(false);
    expect(hasChoice("zaraz-consent={not json", "aNaL")).toBe(false);
  });
});

describe("saving the answer", () => {
  test("sets the purposes, and releases waiting events only when allowed", () => {
    const api = {
      get: vi.fn(),
      modal: false,
      sendQueuedEvents: vi.fn(),
      set: vi.fn(),
    };
    saveChoice(api, { aDs: false, aNaL: false });
    expect(api.set).toHaveBeenLastCalledWith({ aDs: false, aNaL: false });
    expect(api.sendQueuedEvents).not.toHaveBeenCalled();
    saveChoice(api, { aDs: false, aNaL: true });
    expect(api.set).toHaveBeenLastCalledWith({ aDs: false, aNaL: true });
    expect(api.sendQueuedEvents).toHaveBeenCalledOnce();
  });

  test("sends only the purposes Zaraz has, and survives Zaraz refusing", () => {
    const api = {
      get: vi.fn(),
      modal: false,
      purposes: { aNaL: {} },
      set: vi.fn(),
    };
    expect(knownPurposes(api, ["aNaL", "aDs"])).toEqual(["aNaL"]);
    expect(saveChoice(api, { aDs: true, aNaL: true })).toBe(true);
    expect(api.set).toHaveBeenLastCalledWith({ aNaL: true });
    expect(saveChoice(api, { aDs: true })).toBe(false);
    api.set.mockImplementation(() => {
      throw new Error("Unknown purpose id");
    });
    expect(saveChoice(api, { aNaL: false })).toBe(false);
  });
});
