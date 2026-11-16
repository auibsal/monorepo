import { describe, expect, test } from "vitest";
import {
  goodToKnowLines,
  KIT_WORDS,
} from "@/components/diwan/admin/events/promo/words";

const screening = {
  access_detail_ar: "كل المقاعد فوق الدرج، ولا مقاعد في المستوى الأرضي.",
  access_detail_en: "Every seat is up steps; none at ground level.",
  classes: ["member", "associate", "honorary", "guest"],
  content_note_ar: null,
  content_note_en: "Scenes of war.",
  entry: "rsvp",
  language: "both",
  no_photos: false,
  off_campus: false,
  seating: "seated",
  serves_food: true,
  starts_at: "2026-11-22T11:00:00Z",
  step_free: false,
};

describe("the kit's Good to know card", () => {
  test("lists the event's fields in the kit's language", () => {
    expect(goodToKnowLines(screening, "en", "Open to everyone.")).toEqual([
      "Open to everyone.",
      "In English and Arabic",
      "Not step-free · Seated",
      "Every seat is up steps; none at ground level.",
      "Food and drink are served",
      "Content note: Scenes of war.",
      "Photos are taken",
    ]);
  });

  test("leaves out what is not set, one language per piece", () => {
    const lines = goodToKnowLines(
      {
        ...screening,
        language: "ar",
        no_photos: true,
        seating: null,
        serves_food: false,
        step_free: true,
      },
      "ar",
      "مفتوحة للجميع."
    );
    expect(lines).toEqual([
      "مفتوحة للجميع.",
      "اللغة: العربية",
      "بلا درج",
      "كل المقاعد فوق الدرج، ولا مقاعد في المستوى الأرضي.",
    ]);
    expect(
      goodToKnowLines(
        { ...screening, language: null, step_free: null },
        "en",
        "x"
      )
    ).toContain("Seated");
  });

  test("the kit's own words come in both languages", () => {
    expect(Object.keys(KIT_WORDS.ar).sort()).toEqual(
      Object.keys(KIT_WORDS.en).sort()
    );
    expect(KIT_WORDS.en.minutes(12)).toBe("12 min.");
    expect(KIT_WORDS.ar.minutes(12)).toBe("12 دقيقة");
  });
});
