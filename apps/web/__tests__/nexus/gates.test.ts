import { expect, test } from "vitest";
import { isGuestPath } from "@/components/nexus/gates";

test("a partner's guests reach only Qirtas and their work; the rest is /account", () => {
  expect(isGuestPath("/qirtas/write")).toBe(true);
  expect(isGuestPath("/membership/work/abc")).toBe(true);
  expect(isGuestPath("/membership/settings/profile")).toBe(false);
  expect(isGuestPath("/membership/record")).toBe(false);
  expect(isGuestPath("/membership")).toBe(false);
  expect(isGuestPath("/membership/calendar")).toBe(false);
  expect(isGuestPath("/qirtasa")).toBe(false);
});
