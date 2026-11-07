import { describe, expect, test } from "vitest";
import {
  academicYearStart,
  certificateCopy,
  certificateSchema,
  certificateSigners,
  linkedInUrl,
  serviceEntrySchema,
  societyYear,
  societyYearOf,
  verificationUrl,
} from "./recognition";

const member = "00000000-0000-4000-8000-000000000001";

describe("recognition", () => {
  test("the academic year starts on September 1", () => {
    expect(academicYearStart(new Date("2026-10-09T00:00:00Z"))).toBe(
      "2026-09-01"
    );
    expect(academicYearStart(new Date("2027-03-01T00:00:00Z"))).toBe(
      "2026-09-01"
    );
    expect(academicYearStart(new Date("2026-08-31T00:00:00Z"))).toBe(
      "2025-09-01"
    );
  });

  test("hours are logged in quarter hours, at most a day", () => {
    const base = { activity: "Next Stop", occurred_on: "2026-10-01" };
    expect(serviceEntrySchema.safeParse({ ...base, hours: 2.5 }).success).toBe(
      true
    );
    expect(serviceEntrySchema.safeParse({ ...base, hours: 2.1 }).success).toBe(
      false
    );
    expect(serviceEntrySchema.safeParse({ ...base, hours: 25 }).success).toBe(
      false
    );
  });

  test("certificates: Qalam and the Mutanabbi Prize only", () => {
    const student = "00000000-0000-4000-8000-00000000c001";
    expect(
      certificateSchema.safeParse({
        citation_en: "For the best work in Qirtas",
        kind: "prize",
        lang: "en",
        prize_category: "qirtas",
        user_id: member,
      }).success
    ).toBe(true);
    // The Prize needs its category and a citation.
    expect(
      certificateSchema.safeParse({
        kind: "prize",
        lang: "en",
        user_id: member,
      }).success
    ).toBe(false);
    expect(
      certificateSchema.safeParse({
        kind: "qalam",
        lang: "ar",
        qalam_student_id: student,
      }).success
    ).toBe(true);
    expect(
      certificateSchema.safeParse({ kind: "qalam", lang: "en" }).success
    ).toBe(false);
    expect(
      certificateSchema.safeParse({
        kind: "service",
        lang: "en",
        user_id: member,
      }).success
    ).toBe(false);
  });

  test("certificate words: one language each, the lead and date lines", () => {
    expect(certificateCopy.en.lead).toBe("This certifies that");
    expect(certificateCopy.ar.lead).toBe("تشهد الجمعية بأن");
    expect(certificateCopy.en.given("April 27, 2028")).toBe(
      "Given on April 27, 2028"
    );
    expect(certificateCopy.ar.given("27 نيسان 2028")).toBe(
      "مُنحت في 27 نيسان 2028"
    );
    expect(certificateSigners.qalam).toEqual(["qalam_lead", "eic"]);
    expect(certificateSigners.prize).toEqual(["eic", "president"]);
  });

  test("verification and LinkedIn links carry the serial and the code", () => {
    const url = verificationUrl("https://auibsal.org/", "/verify", "abc123");
    expect(url).toBe("https://auibsal.org/verify/abc123");
    expect(verificationUrl("https://auibsal.org", "/ar/verify", "abc123")).toBe(
      "https://auibsal.org/ar/verify/abc123"
    );
    const linkedIn = new URL(
      linkedInUrl({
        issuedAt: "2026-10-09T10:00:00Z",
        name: "The Mutanabbi Prize",
        serial: "SAL-2026-001",
        url,
      })
    );
    expect(linkedIn.searchParams.get("certId")).toBe("SAL-2026-001");
    expect(linkedIn.searchParams.get("certUrl")).toBe(url);
    expect(linkedIn.searchParams.get("issueMonth")).toBe("10");
  });
});

describe("the academic year of a member's summary", () => {
  test("runs from September 1, as service hours count it", () => {
    expect(societyYearOf(new Date("2026-11-05T12:00:00Z"))).toBe(2026);
    expect(societyYearOf(new Date("2027-08-31T12:00:00Z"))).toBe(2026);
    expect(societyYearOf(new Date("2027-09-01T12:00:00Z"))).toBe(2027);
    expect(societyYear(2026)).toEqual({
      from: "2026-09-01T00:00:00+03:00",
      to: "2027-09-01T00:00:00+03:00",
    });
  });
});
