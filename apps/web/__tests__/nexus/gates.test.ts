import { expect, test } from "vitest";
import { isGuestPath } from "@/components/nexus/gates";

test("a partner's members reach only Qirtas, profile, service and certificates", () => {
  expect(isGuestPath("/qirtas/write")).toBe(true);
  expect(isGuestPath("/qirtas/submit")).toBe(true);
  expect(isGuestPath("/membership/profile")).toBe(true);
  expect(isGuestPath("/membership/service")).toBe(true);
  expect(isGuestPath("/membership/certificate")).toBe(true);
  expect(isGuestPath("/membership")).toBe(false);
  expect(isGuestPath("/events/book")).toBe(false);
  expect(isGuestPath("/membership/offers")).toBe(false);
  expect(isGuestPath("/qirtasa")).toBe(false);
});
