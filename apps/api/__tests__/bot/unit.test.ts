// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
process.env.SKIP_ENV_VALIDATION = "true";

import { copy, langOf } from "@/lib/bot/copy";
import type { EventRow } from "@/lib/bot/db";
import { baghdadHour } from "@/lib/bot/feeds";
import { eventText } from "@/lib/bot/format";
import {
  eventCalendar,
  mainApp,
  messageLink,
  piecePage,
  wordPage,
} from "@/lib/bot/links";

const EXCLAMATION = /[!！]/;
const EMOJI = /\p{Extended_Pictographic}/u;

const strings = (value: unknown): string[] => {
  if (typeof value === "string") {
    return [value];
  }
  if (typeof value === "function") {
    return [String((value as (...a: string[]) => string)("X", "Y", "Z"))];
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(strings);
  }
  return [];
};

describe("copy", () => {
  it("has every key in both languages", () => {
    expect(Object.keys(copy.ar).sort()).toEqual(Object.keys(copy.en).sort());
    expect(Object.keys(copy.ar.buttons).sort()).toEqual(
      Object.keys(copy.en.buttons).sort()
    );
  });

  it("keeps the brand voice: no exclamation marks, no emoji", () => {
    for (const text of [...strings(copy.en), ...strings(copy.ar)]) {
      expect(text).not.toMatch(EXCLAMATION);
      expect(text).not.toMatch(EMOJI);
    }
  });

  it("keeps command descriptions within Telegram's limit", () => {
    for (const t of [copy.en, copy.ar]) {
      for (const description of Object.values(t.commands)) {
        expect(description.length).toBeLessThanOrEqual(256);
      }
      expect(t.shortDescription.length).toBeLessThanOrEqual(120);
      expect(t.description.length).toBeLessThanOrEqual(512);
    }
  });

  it("picks Arabic for Arabic Telegram apps", () => {
    expect(langOf("ar")).toBe("ar");
    expect(langOf("ar-IQ")).toBe("ar");
    expect(langOf("en-GB")).toBe("en");
    expect(langOf(undefined)).toBe("en");
  });
});

describe("formatting", () => {
  const event: EventRow = {
    capacity: 10,
    confirmed: 9,
    ends_at: null,
    id: "e1",
    members_only: false,
    mine: null,
    rsvp_enabled: true,
    slug: "open-mic",
    starts_at: "2026-10-27T15:00:00Z",
    summary_ar: null,
    summary_en: "Poems <and> songs",
    title_ar: "أمسية",
    title_en: "Open Mic & Friends",
    venue_ar: null,
    venue_en: "Library",
  };

  it("writes an event card in Baghdad time, escaped", () => {
    const text = eventText("en", event);
    expect(text).toContain("<b>Open Mic &amp; Friends</b>");
    expect(text).toContain("Tuesday, October 27 · 6:00 PM");
    expect(text).toContain("Poems &lt;and&gt; songs");
    expect(text).toContain("1 place left");
  });

  it("shows the member's own place instead of the count", () => {
    expect(eventText("en", { ...event, mine: "confirmed" })).toContain(
      "You have a place."
    );
    expect(eventText("ar", event)).toContain("أمسية");
  });

  it("knows the hour in Baghdad", () => {
    expect(baghdadHour(new Date("2026-10-22T06:30:00Z"))).toBe(9);
  });
});

describe("links", () => {
  it("never writes /en", () => {
    expect(piecePage("en", "a-poem")).toBe(
      "https://auibsal.org/waraq/pieces/a-poem"
    );
    expect(piecePage("ar", "a-poem")).toBe(
      "https://auibsal.org/ar/waraq/pieces/a-poem"
    );
    expect(eventCalendar("ar", "open-mic")).toBe(
      "https://api.auibsal.org/calendar/events/open-mic.ics?lang=ar"
    );
  });

  it("links to a message in a supergroup topic", () => {
    expect(messageLink(-1_001_234_567_890, 42, 7)).toBe(
      "https://t.me/c/1234567890/7/42"
    );
  });
});

describe("daily word", () => {
  it("opens auibsal.org's game as the bot's Main App", () => {
    expect(mainApp("sal_test_bot")).toBe("https://t.me/sal_test_bot?startapp");
    expect(wordPage("ar")).toBe("https://auibsal.org/ar/waraq/games/word");
  });
});
