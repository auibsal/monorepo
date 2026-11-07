import { expect, test } from "vitest";
import { kindOpens } from "@/components/diwan/gates";

test("every kind of membership opens Today; members open everything", () => {
  for (const kind of ["member", "guest", "partner", null] as const) {
    expect(kindOpens(kind, "/account")).toBe(true);
  }
  expect(kindOpens("member", "/account/society")).toBe(true);
  expect(kindOpens("member", "/diwan/events")).toBe(true);
});

test("guests open their calendar, record, settings, work and Qirtas", () => {
  expect(kindOpens("guest", "/account/calendar")).toBe(true);
  expect(kindOpens("guest", "/account/work/abc")).toBe(true);
  expect(kindOpens("guest", "/qirtas/write")).toBe(true);
  expect(kindOpens("guest", "/account/society")).toBe(false);
  expect(kindOpens("guest", "/account/requests")).toBe(false);
  expect(kindOpens("guest", "/qirtasa")).toBe(false);
});

test("a partner's people open their record and settings; nothing yet, settings", () => {
  expect(kindOpens("partner", "/account/record")).toBe(true);
  expect(kindOpens("partner", "/account/calendar")).toBe(false);
  expect(kindOpens("partner", "/qirtas/write")).toBe(false);
  expect(kindOpens(null, "/account/settings/profile")).toBe(true);
  expect(kindOpens(null, "/account/record")).toBe(false);
});
