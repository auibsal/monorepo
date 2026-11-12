import { expect, test } from "vitest";
import { firstVisitToArabic, prefersArabic } from "./first-visit";

test("Arabic first in the browser's list", () => {
  expect(prefersArabic("ar-IQ,ar;q=0.9,en;q=0.8")).toBe(true);
  expect(prefersArabic("en-US,en;q=0.9,ar;q=0.8")).toBe(false);
  expect(prefersArabic("ar")).toBe(true);
  expect(prefersArabic("fr,ckb;q=0.5")).toBe(false);
  expect(prefersArabic(null)).toBe(false);
});

const request = (
  over: Partial<{ cookie: boolean; path: string; ua: string }>
) => ({
  cookies: { has: () => over.cookie ?? false },
  headers: new Headers({
    accept: "text/html",
    "accept-language": "ar-IQ,ar;q=0.9",
    "user-agent": over.ua ?? "Mozilla/5.0",
  }),
  method: "GET",
  nextUrl: { pathname: over.path ?? "/events" },
});

test("only a person's first visit to an English page", () => {
  expect(firstVisitToArabic(request({}))).toBe(true);
  expect(firstVisitToArabic(request({ cookie: true }))).toBe(false);
  expect(firstVisitToArabic(request({ path: "/ar/events" }))).toBe(false);
  expect(firstVisitToArabic(request({ ua: "Googlebot/2.1" }))).toBe(false);
});
