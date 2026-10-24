import { expect, test } from "vitest";
import { isGuestPath } from "@/components/nexus/gates";

test("a partner's members reach only Qirtas, profile, service and certificates", () => {
  expect(isGuestPath("/qirtas/write")).toBe(true);
  expect(isGuestPath("/qirtas/submit")).toBe(true);
  expect(isGuestPath("/account/profile")).toBe(true);
  expect(isGuestPath("/account/service")).toBe(true);
  expect(isGuestPath("/account/certificate")).toBe(true);
  expect(isGuestPath("/account")).toBe(false);
  expect(isGuestPath("/events/book")).toBe(false);
  expect(isGuestPath("/account/offers")).toBe(false);
  expect(isGuestPath("/qirtasa")).toBe(false);
});
