import { describe, expect, it } from "vitest";
import { eventSlug, isAddress, slugFromTitle, transliterate } from "./index";

describe("addresses made from titles", () => {
  it("makes lowercase words joined by hyphens from the English title", () => {
    expect(slugFromTitle("The Return: A Reading, 2026!")).toBe(
      "the-return-a-reading-2026"
    );
  });

  it("drops accents and keeps only ASCII", () => {
    expect(slugFromTitle("Café Société")).toBe("cafe-societe");
  });

  it("writes an Arabic-only title in Latin letters, glossary words first", () => {
    expect(slugFromTitle("", "قرطاس الشتاء")).toBe("qirtas-al-shta");
    expect(transliterate("هدهد")).toBe("hudhud");
  });

  it("makes an event's address from its title alone, with no date", () => {
    expect(eventSlug("Writing workshop", "")).toBe("writing-workshop");
    expect(eventSlug("", "")).toBe("event");
  });

  it("never ends on a hyphen when cut short", () => {
    const long = slugFromTitle("a ".repeat(40));
    expect(long.endsWith("-")).toBe(false);
    expect(isAddress(long)).toBe(true);
  });

  it("tells an address that follows the pattern from one that doesn't", () => {
    expect(isAddress("open-pages-2026-11-22")).toBe(true);
    expect(isAddress("Open_Pages/")).toBe(false);
  });
});
