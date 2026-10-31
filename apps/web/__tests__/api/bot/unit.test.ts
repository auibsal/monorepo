// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
process.env.SKIP_ENV_VALIDATION = "true";

import { copy, langOf } from "@/lib/api/bot/copy";
import type { EventRow } from "@/lib/api/bot/db";
import { baghdadHour } from "@/lib/api/bot/feeds";
import { eventText } from "@/lib/api/bot/format";
import {
  eventCalendar,
  mainApp,
  messageLink,
  piecePage,
  wordPage,
} from "@/lib/api/bot/links";
import { briefText, summaryText } from "@/lib/api/bot/staff";

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
    expect(piecePage("en", { desk: "letters", slug: "a-poem" })).toBe(
      "https://auibsal.org/qirtas/letters/a-poem"
    );
    expect(piecePage("ar", { desk: "letters", slug: "a-poem" })).toBe(
      "https://auibsal.org/ar/qirtas/letters/a-poem"
    );
    expect(eventCalendar("ar", "open-mic")).toBe(
      "https://auibsal.org/api/calendar/events/open-mic.ics?lang=ar"
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
    expect(wordPage("ar")).toBe("https://auibsal.org/ar/qirtas/games/word");
  });
});

describe("the Diwan group", () => {
  const waiting = {
    grants_asked: 0,
    hiring_new: 2,
    partner_applications: 1,
    perks_waiting: 0,
    requests_open: 0,
    submissions_new: 0,
  };
  it("briefs the morning with today's events and only what waits", () => {
    const text = briefText(
      { lang: "en" },
      {
        events: [
          {
            booked: 12,
            capacity: 30,
            entry: "rsvp",
            slug: "salon",
            starts_at: "2026-11-01T15:00:00Z",
            title_ar: "الصالون",
            title_en: "The Salon <live>",
            venue_ar: null,
            venue_en: "Hall B",
            waitlisted: 3,
          },
        ],
        waiting,
      },
      new Date("2026-11-01T06:00:00Z")
    );
    expect(text).toContain("The Salon &lt;live&gt;");
    expect(text).toContain("6:00 PM");
    expect(text).toContain("12 booked of 30");
    expect(text).toContain("3 on the waitlist");
    expect(text).toContain("Partner applications: 1");
    expect(text).toContain("New replies to openings: 2");
    expect(text).not.toContain("Perks waiting");
  });

  it("says when nothing is on and nothing waits", () => {
    const text = briefText(
      { lang: "ar" },
      {
        events: [],
        waiting: { ...waiting, hiring_new: 0, partner_applications: 0 },
      },
      new Date("2026-11-01T06:00:00Z")
    );
    expect(text).toContain(copy.ar.briefNoEvents);
    expect(text).toContain(copy.ar.briefNothing);
  });

  it("sums up an event: who came, walk-ins and no-shows", () => {
    const text = summaryText(
      { lang: "en" },
      {
        booked: 10,
        booked_and_came: 8,
        checked_in: 11,
        id: "x",
        slug: "salon",
        title_ar: "الصالون",
        title_en: "The Salon",
        waitlisted: 0,
      }
    );
    expect(text).toContain("11 came: 8 who booked, 3 without a booking");
    expect(text).toContain("2 booked and didn't come");
    expect(text).not.toContain("waitlist");
  });
});
