import { describe, expect, it } from "vitest";
import type { FeedEvent } from "@/lib/api/ical";
import { termsFromFeed } from "@/lib/api/terms";

const day = (title: string, start: string): FeedEvent => ({
  allDay: true,
  end: null,
  location: null,
  start,
  title,
  uid: title,
  url: null,
});

describe("termsFromFeed", () => {
  it("pairs each semester's first day with its last", () => {
    const terms = termsFromFeed([
      day(
        "Spring Semester Ends - last day on campus",
        "2027-05-20T00:00:00+03:00"
      ),
      day("First day of Fall Semester - UGRD", "2026-09-06T00:00:00+03:00"),
      day("Midterm exams", "2026-10-25T00:00:00+03:00"),
      day(
        "Fall Semester Ends - last day on campus",
        "2026-12-24T00:00:00+03:00"
      ),
      day("First day of Spring Semester - UGRD", "2027-01-31T00:00:00+03:00"),
    ]);
    expect(terms).toEqual([
      {
        code: "fall-2026",
        ends_on: "2026-12-24",
        name_ar: "خريف 2026",
        name_en: "Fall 2026",
        starts_on: "2026-09-06",
      },
      {
        code: "spring-2027",
        ends_on: "2027-05-20",
        name_ar: "ربيع 2027",
        name_en: "Spring 2027",
        starts_on: "2027-01-31",
      },
    ]);
  });

  it("leaves out a term the feed has not closed yet", () => {
    expect(
      termsFromFeed([
        day("First day of Summer Semester - UGRD", "2027-06-06T00:00:00+03:00"),
      ])
    ).toEqual([]);
  });
});
