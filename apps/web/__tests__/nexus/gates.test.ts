import { expect, test } from "vitest";
import { isGuestPath } from "@/components/nexus/gates";

test("a partner's members reach only Qirtas, their work, Record and Settings", () => {
  expect(isGuestPath("/qirtas/write")).toBe(true);
  expect(isGuestPath("/membership/work/abc")).toBe(true);
  expect(isGuestPath("/membership/settings/profile")).toBe(true);
  expect(isGuestPath("/membership/record")).toBe(true);
  expect(isGuestPath("/membership/record/abc")).toBe(true);
  expect(isGuestPath("/membership")).toBe(false);
  expect(isGuestPath("/membership/calendar")).toBe(false);
  expect(isGuestPath("/membership/offers")).toBe(false);
  expect(isGuestPath("/qirtasa")).toBe(false);
});
