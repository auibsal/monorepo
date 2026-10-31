import { expect, test } from "vitest";
import { kindOpens } from "@/components/nexus/gates";

test("every kind of membership opens Today; members open everything", () => {
  for (const kind of ["member", "guest", "partner", null] as const) {
    expect(kindOpens(kind, "/membership")).toBe(true);
  }
  expect(kindOpens("member", "/membership/society")).toBe(true);
  expect(kindOpens("member", "/diwan/events")).toBe(true);
});

test("guests open their calendar, record, settings, work and Qirtas", () => {
  expect(kindOpens("guest", "/membership/calendar")).toBe(true);
  expect(kindOpens("guest", "/membership/work/abc")).toBe(true);
  expect(kindOpens("guest", "/qirtas/write")).toBe(true);
  expect(kindOpens("guest", "/membership/society")).toBe(false);
  expect(kindOpens("guest", "/membership/requests")).toBe(false);
  expect(kindOpens("guest", "/qirtasa")).toBe(false);
});

test("a partner's people open their record and settings; nothing yet, settings", () => {
  expect(kindOpens("partner", "/membership/record")).toBe(true);
  expect(kindOpens("partner", "/membership/calendar")).toBe(false);
  expect(kindOpens("partner", "/qirtas/write")).toBe(false);
  expect(kindOpens(null, "/membership/settings/profile")).toBe(true);
  expect(kindOpens(null, "/membership/record")).toBe(false);
});
