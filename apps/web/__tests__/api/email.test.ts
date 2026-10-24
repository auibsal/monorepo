// @vitest-environment node
import { render } from "@react-email/components";
import {
  decision,
  monthInWaraq,
  newsletterConfirm,
  removalReceived,
  rsvpConfirmed,
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
  test("both languages, the recipient's first, with Baghdad time", async () => {
    const built = rsvpConfirmed("ar", event, APP);
    expect(built.subject).toBe("حُجز مكانك: يوم الميثاق");
    expect(built.blocks.map((b) => b.lang)).toEqual(["ar", "en"]);
    const html = await render(Notice(built));
    expect(html).toContain("Tuesday, October 13 · 6:00 PM");
    expect(html).toContain("Main Hall");
    expect(html.indexOf("حُجز مكانك")).toBeLessThan(
      html.indexOf("booked: Charter Day")
    );
    expect(html).toContain(`href="${APP}/ar/nexus"`);
  });

  test("no images, no exclamation marks in headings", async () => {
    const built = [
      decision("en", "The First Rain", "accept", APP),
      decision("en", "The First Rain", "decline", APP),
      removalReceived("en", "2026-10-08T04:00:00.000Z"),
    ];
    const html = await Promise.all(built.map((b) => render(Notice(b))));
    for (const page of html) {
      expect(page).not.toContain("<img");
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
    expect(built.subject).toBe(
      "Confirm your subscription to The Month in Waraq"
    );
    expect(built.blocks[0]?.action?.href).toBe(
      "https://auibsal.org/newsletter/confirm?token=abc"
    );
  });

  test("the Month in Waraq lists pieces and events and ends with unsubscribe", () => {
    const built = monthInWaraq(
      "ar",
      [
        {
          desk_ar: "أخبار",
          desk_en: "News",
          title_ar: "خبر",
          title_en: "A story",
          url: "https://auibsal.org/ar/waraq/pieces/a-story",
        },
      ],
      [{ ...event, url: "https://auibsal.org/ar/events/charter-day" }],
      "https://auibsal.org/ar/waraq",
      "https://auibsal.org/ar/newsletter/unsubscribe?token=t"
    );
    expect(built.subject).toBe("شهر في ورق");
    const english = built.blocks.find((b) => b.lang === "en");
    expect(english?.paragraphs).toContain(
      "News: A story https://auibsal.org/ar/waraq/pieces/a-story"
    );
    expect(english?.paragraphs.at(-1)).toBe(
      "To unsubscribe: https://auibsal.org/ar/newsletter/unsubscribe?token=t"
    );
    expect(
      english?.paragraphs.some((p) => p.startsWith("Tuesday, October 13"))
    ).toBe(true);
  });
});
