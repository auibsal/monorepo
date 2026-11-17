import { describe, expect, test, vi } from "vitest";
import { NextEvents } from "@/components/diwan/home/next-events";
import { MyPrograms } from "@/components/diwan/home/programs";
import { renderWithApp } from "./render";

// Today shows only what needs the person (decisions.md, The site): a
// section with nothing in it renders nothing at all.
vi.mock("@/lib/diwan/queries", async (original) => ({
  ...(await original<typeof import("@/lib/diwan/queries")>()),
  useMyRsvps: () => ({ data: [], isPending: false }),
  useMyShifts: () => ({ data: [], isPending: false }),
  useMyWaitlist: () => ({ data: [], isPending: false }),
}));

describe("Today's sections when empty", () => {
  test("Your next events renders nothing", () => {
    const { container } = renderWithApp(<NextEvents />, { locale: "en" });
    expect(container.innerHTML).toBe("");
  });

  test("Your shifts render nothing", () => {
    const { container } = renderWithApp(<MyPrograms />, { locale: "en" });
    expect(container.innerHTML).toBe("");
  });
});
