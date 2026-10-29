// @vitest-environment node
import { render } from "@react-email/components";
import {
  decision,
  newsletterConfirm,
  removalReceived,
  rsvpConfirmed,
  sundayPaper,
} from "@repo/email/copy";
import { Notice } from "@repo/email/templates/notice";
import { describe, expect, test } from "vitest";

const event = {
  starts_at: "2026-10-13T15:00:00.000Z",
  title_ar: "يوم الميثاق",
  title_en: "Charter Day",
  venue_ar: null,
  venue_en: "Main Hall",
};
const APP = "https://auibsal.org";

describe("platform email", () => {
  test("the recipient's language only, with Baghdad time", async () => {
    const built = rsvpConfirmed("ar", event, APP);
    expect(built.subject).toBe("حُجز مكانك: يوم الميثاق");
    expect(built.blocks.map((b) => b.lang)).toEqual(["ar"]);
    const html = await render(Notice(built));
    expect(html).toContain("حُجز مكانك");
    expect(html).not.toContain("booked: Charter Day");
    expect(html).toContain("/brand/sal-lockup-horizontal-ar-email.png");
    expect(html).toContain(`href="${APP}/ar/events/book"`);
    const english = await render(Notice(rsvpConfirmed("en", event, APP)));
    expect(english).toContain("Tuesday, October 13 · 6:00 PM");
    expect(english).toContain("Main Hall");
    expect(english).not.toContain("حُجز مكانك");
  });

  test("one image, the lockup; no exclamation marks in headings", async () => {
    const built = [
      decision("en", "The First Rain", "accept", APP),
      decision("en", "The First Rain", "decline", APP),
      removalReceived("en", "2026-10-08T04:00:00.000Z"),
    ];
    const html = await Promise.all(built.map((b) => render(Notice(b))));
    for (const page of html) {
      // The lockup in the email's language heads it, and nothing else.
      const images = page.match(/<img[^>]*>/g) ?? [];
      expect(images).toHaveLength(1);
      expect(images[0]).toContain("/brand/sal-lockup-horizontal-email.png");
    }
    for (const block of built.flatMap((b) => b.blocks)) {
      expect(block.heading).not.toContain("!");
    }
  });

  test("acceptance points to the agreement; a decline does not", () => {
    const [accepted] = decision("en", "W", "accept", APP).blocks;
    const [declined] = decision("en", "W", "decline", APP).blocks;
    expect(accepted?.paragraphs.join(" ")).toContain("Publication Agreement");
    expect(declined?.paragraphs.join(" ")).not.toContain("Agreement");
    expect(declined?.paragraphs.join(" ")).toContain("submit again");
  });
});

describe("the newsletter", () => {
  test("the confirmation asks before anything else is sent", () => {
    const built = newsletterConfirm(
      "en",
      "https://auibsal.org/newsletter/confirm?token=abc"
    );
    expect(built.subject).toBe("Confirm your subscription to the Sunday Paper");
    expect(built.blocks[0]?.action?.href).toBe(
      "https://auibsal.org/newsletter/confirm?token=abc"
    );
  });

  test("the Sunday Paper lists pieces, What's on and open places, and ends with the stop link", () => {
    const built = sundayPaper("en", {
      callboard: "https://auibsal.org/callboard",
      events: [{ ...event, url: "https://auibsal.org/events/charter-day" }],
      front: "https://auibsal.org/qirtas",
      pieces: [
        {
          desk_ar: "أخبار",
          desk_en: "News",
          title_ar: "خبر",
          title_en: "A story",
          url: "https://auibsal.org/qirtas/pieces/a-story",
        },
      ],
      places: [{ title_ar: "مصوّر", title_en: "Photographer" }],
      stop: "https://auibsal.org/newsletter/unsubscribe?token=t",
    });
    expect(built.subject).toBe("The Sunday Paper from Qirtas");
    expect(built.blocks.map((b) => b.lang)).toEqual(["en"]);
    const english = built.blocks.find((b) => b.lang === "en");
    expect(english?.paragraphs).toContain(
      "News: A story https://auibsal.org/qirtas/pieces/a-story"
    );
    expect(english?.paragraphs).toContain("Photographer");
    expect(english?.paragraphs.at(-1)).toBe(
      "To stop the Sunday Paper: https://auibsal.org/newsletter/unsubscribe?token=t"
    );
    expect(
      english?.paragraphs.some((p) => p.startsWith("Tuesday, October 13"))
    ).toBe(true);
  });
});
