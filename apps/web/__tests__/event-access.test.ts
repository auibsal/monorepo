import { accessSentence, thanksForComing } from "@repo/email/copy";
import { describe, expect, test } from "vitest";
import {
  CLASSES,
  classesLabel,
  feedbackOpen,
  feedbackWindow,
  guestsBookBy,
  isEveryone,
} from "@/lib/data/events";

const names = {
  associate: "Associate Members",
  guest: "Guests",
  honorary: "Honorary Members",
  member: "Members",
};
const label = (classes: string[]) =>
  classesLabel(classes, {
    everyone: "Everyone",
    locale: "en",
    names,
    only: (name) => `${name} only`,
  });

describe("who can come (decisions.md, Events: Access)", () => {
  test("all four classes are Everyone; one is “only”; more are a list", () => {
    expect(isEveryone([...CLASSES])).toBe(true);
    expect(label([...CLASSES])).toBe("Everyone");
    expect(label(["member"])).toBe("Members only");
    expect(label(["guest", "member"])).toBe("Members and Guests");
    expect(label(["member", "associate", "guest"])).toBe(
      "Members, Associate Members, and Guests"
    );
  });

  test("on campus, Guests book until 14 days before; off campus, never closed", () => {
    expect(
      guestsBookBy({ off_campus: false, starts_at: "2026-11-22T11:00:00.000Z" })
    ).toBe("2026-11-08T11:00:00.000Z");
    expect(
      guestsBookBy({ off_campus: true, starts_at: "2026-11-22T11:00:00.000Z" })
    ).toBeNull();
  });

  test("the email says who can come and how, in each language", () => {
    const event = {
      classes: [...CLASSES],
      entry: "rsvp",
      off_campus: false,
      starts_at: "2026-11-22T11:00:00Z",
    };
    expect(accessSentence(event, "en")).toBe(
      "Open to everyone; booking required. Guests book by Sunday, November 8."
    );
    expect(
      accessSentence({ ...event, classes: ["member"], entry: "open" }, "en")
    ).toBe("Open to Members; no booking needed.");
    expect(accessSentence(event, "ar")).toContain("مفتوحة للجميع");
  });
});

describe("How was it? (decisions.md, Events)", () => {
  const event = {
    ends_at: "2026-11-22T13:00:00Z",
    starts_at: "2026-11-22T11:00:00Z",
  };

  test("opens at the start and closes 14 days after the end", () => {
    const { closes, opens } = feedbackWindow(event);
    expect(new Date(opens).toISOString()).toBe("2026-11-22T11:00:00.000Z");
    expect(new Date(closes).toISOString()).toBe("2026-12-06T13:00:00.000Z");
    expect(feedbackOpen(event, Date.parse("2026-11-22T10:59:00Z"))).toBe(false);
    expect(feedbackOpen(event, Date.parse("2026-11-22T12:00:00Z"))).toBe(true);
    expect(feedbackOpen(event, Date.parse("2026-11-23T06:00:00Z"))).toBe(true);
    expect(feedbackOpen(event, Date.parse("2026-12-07T00:00:00Z"))).toBe(false);
  });

  test("with no end, it closes 14 days after two hours past the start", () => {
    expect(
      feedbackWindow({ ends_at: null, starts_at: event.starts_at }).closes
    ).toBe(Date.parse("2026-12-06T13:00:00Z"));
  });

  test("“Thanks for coming” links to the question on the event's page", () => {
    const built = thanksForComing(
      "en",
      {
        slug: "screening",
        starts_at: event.starts_at,
        title_ar: "عرض",
        title_en: "The screening",
        venue_ar: null,
        venue_en: null,
      },
      "https://auibsal.org"
    );
    expect(built.subject).toBe("Thanks for coming: The screening");
    expect(JSON.stringify(built.blocks)).toContain(
      "https://auibsal.org/events/screening#feedback"
    );
  });
});
