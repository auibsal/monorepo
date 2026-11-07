// @vitest-environment node
import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/api/notion/publish", () => ({ stamp: () => "today" }));

const { offSite, takenOffNote } = await import("@/lib/api/notion/unpublish");

type Page = Parameters<typeof offSite>[0];
const status = (name: string) =>
  ({
    id: "p",
    properties: { Status: { select: { name }, type: "select" } },
  }) as unknown as Page;

describe("taking things off the site (audit A3)", () => {
  test("a row set back from Published, or trashed, comes off", () => {
    expect(offSite(status("Planning"))).toBe(true);
    expect(offSite(status("Draft"))).toBe(true);
    expect(offSite(status("Retired"))).toBe(true);
    expect(offSite(undefined)).toBe(true);
  });

  test("published rows and those waiting to publish stay", () => {
    expect(offSite(status("Published"))).toBe(false);
    expect(offSite(status("Ready to publish"))).toBe(false);
    expect(offSite(status("Cancel on the site"))).toBe(false);
  });

  test("the row says what happened", () => {
    expect(takenOffNote("Status set to Planning")).toBe(
      "Taken off the site today (Status set to Planning). Set Ready to publish to bring it back."
    );
  });
});
