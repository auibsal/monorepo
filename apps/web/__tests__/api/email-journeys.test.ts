// @vitest-environment node
import { render } from "@react-email/components";
import {
  accountDeleted,
  applicationDecided,
  applicationReceived,
  applicationWaiting,
  type Built,
  candidacyDecided,
  certificateIssued,
  eventChanged,
  invitation,
  type Lang,
  newsletterConfirm,
  removalDone,
  repliesDigest,
  replyUpdate,
  requestUpdated,
  roleAssigned,
  welcome,
} from "@repo/email/copy";
import { Notice, noticeText } from "@repo/email/templates/notice";
import { describe, expect, test } from "vitest";

const APP = "https://auibsal.org";
const event = {
  starts_at: "2026-11-17T13:00:00.000Z",
  title_ar: "الصفحات المفتوحة",
  title_en: "Open Pages",
  venue_ar: "المكتبة",
  venue_en: "The library",
};

/** One sample of every email added or reshaped in the audit. */
const every = (l: Lang): Built[] => [
  eventChanged(l, event, "cancelled", APP),
  eventChanged(l, event, "moved", APP),
  applicationReceived(l, "The Book Club", APP),
  applicationWaiting(l, "The Book Club", APP),
  applicationDecided(l, "The Book Club", true, APP),
  applicationDecided(l, "The Book Club", false, APP),
  candidacyDecided(l, { title_ar: "الرئيس", title_en: "President" }, true, APP),
  certificateIssued(l, "Director of Media", "abc", APP),
  requestUpdated(l, "f20", "acknowledged", "abc", APP),
  requestUpdated(l, "f09", "closed", "abc", APP),
  removalDone(l, "removed", null),
  replyUpdate(l, "Photographer", "talking", "2026-11-10T13:00:00Z", APP),
  replyUpdate(l, "Photographer", "not_picked", null, APP),
  invitation(
    l,
    {
      first_name: "Lina",
      kind: "tour",
      pages: 2,
      station: "Library",
      words: "a / b",
    },
    APP
  ),
  invitation(
    l,
    { first_name: null, kind: "plain", pages: 0, station: null, words: null },
    APP
  ),
  roleAssigned(
    l,
    { ends_at: null, name_ar: "محرر", name_en: "Editor" },
    true,
    APP
  ),
  welcome(l, APP),
  accountDeleted(l),
  repliesDigest(
    l,
    [{ member: "A member", note: null, role: "Photographer" }],
    APP
  ),
];

describe("the email journeys", () => {
  test("every email has a heading without an exclamation mark and a preview that isn't the subject", () => {
    for (const lang of ["en", "ar"] as const) {
      for (const built of every(lang)) {
        expect(built.subject.length).toBeGreaterThan(0);
        expect(built.subject).not.toContain("!");
        expect(built.preview).not.toBe(built.subject);
        expect(built.blocks.map((b) => b.lang)).toEqual([lang]);
      }
    }
  });

  test("an event canceled says the booking is canceled; one moved gives the new time", () => {
    const canceled = eventChanged("en", event, "cancelled", APP);
    expect(canceled.subject).toBe("Canceled: Open Pages");
    const moved = eventChanged("en", event, "moved", APP);
    expect(moved.blocks[0]?.paragraphs).toContain("The library");
    expect(
      moved.blocks[0]?.paragraphs.some((p) =>
        p.startsWith("Tuesday, November 17")
      )
    ).toBe(true);
  });

  test("a request closed links to its own page", () => {
    const built = requestUpdated("en", "f20", "closed", "abc", APP);
    expect(built.subject).toBe("We've closed your concern");
    expect(built.blocks[0]?.action?.href).toBe(
      "https://auibsal.org/membership/requests/abc"
    );
  });

  test("the welcome lists where to start, as links, in the page's language", async () => {
    const built = welcome("ar", APP);
    const items = built.blocks[0]?.lists?.[0]?.items ?? [];
    expect(items.map((i) => i.href)).toContain("https://auibsal.org/ar/events");
    const html = await render(Notice(built));
    expect(html).toContain('href="https://auibsal.org/ar/qirtas/write"');
  });

  test("confirmations repeat their link under the button, in HTML and text", async () => {
    const built = newsletterConfirm("en", "https://auibsal.org/c?token=t");
    const html = await render(Notice(built));
    expect(html).toContain("If the button doesn&#x27;t work");
    expect(noticeText(built)).toContain("https://auibsal.org/c?token=t");
  });

  test("a footer line says why the email came, with its link", async () => {
    const footer = [
      {
        href: "https://auibsal.org/membership/settings/notices",
        link: "Notices",
        text: "You get this because you have an account with the Society. Choose your emails on",
      },
    ];
    const built = welcome("en", APP);
    const html = await render(Notice({ ...built, footer }));
    expect(html).toContain("membership/settings/notices");
    expect(noticeText({ blocks: built.blocks, footer })).toContain(
      "Choose your emails on Notices: https://auibsal.org/membership/settings/notices"
    );
  });

  test("the role email asks for two-step sign-in only when the role needs it", () => {
    const role = { ends_at: null, name_ar: "محرر", name_en: "Editor" };
    const strict = roleAssigned("en", role, true, APP);
    const plain = roleAssigned("en", role, false, APP);
    expect(strict.blocks[0]?.paragraphs.join(" ")).toContain("two-step");
    expect(plain.blocks[0]?.paragraphs.join(" ")).not.toContain("two-step");
  });
});
