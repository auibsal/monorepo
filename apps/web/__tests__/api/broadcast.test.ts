// @vitest-environment node
import { render } from "@react-email/components";
import {
  contactField,
  invitation,
  invitationBroadcast,
  invitationContact,
} from "@repo/email/copy";
import { Notice } from "@repo/email/templates/notice";
import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { contactsCsv } = await import("@/lib/api/broadcast");

const JOIN = "https://auibsal.org/join";

describe("the invitation as one Broadcast", () => {
  test("the greeting and the Tour line are each recipient's own", async () => {
    const built = invitationBroadcast("en", "tour", JOIN);
    const html = await render(
      Notice({ blocks: built.blocks, preview: built.preview })
    );
    expect(html).toContain(contactField("greeting"));
    expect(html).toContain(contactField("tour_line"));
    expect(built.subject).toBe("Your six words from the Typewriter Tour");
  });

  test("filled in, it reads as the one-by-one email does", () => {
    const invite = {
      first_name: "Wid",
      kind: "tour" as const,
      pages: 2,
      station: "English Language Academy, College of Law",
      words:
        "Let's go to the moon, together. / NEW DAWN FADES, NEVER FORGET ME.",
    };
    const contact = invitationContact("en", invite);
    const [block] = invitation("en", invite, JOIN).blocks;
    expect(contact.greeting).toBe(block?.paragraphs[0]);
    expect(contact.tour_line).toBe(block?.paragraphs[1]);
    expect(contact.tour_line).toContain(
      "at the English Language Academy and the College of Law"
    );
  });

  test("with no first name and no words to quote", () => {
    expect(
      invitationContact("en", {
        first_name: null,
        kind: "tour",
        pages: 1,
        station: "Food Court or the club fair",
        words: null,
      })
    ).toEqual({
      greeting: "Hello,",
      tour_line:
        "Last February you sat down at our typewriter at the Food Court or the club fair. We kept your page.",
    });
  });
});

describe("the President's letter", () => {
  test("quotes end once, inner quotes turn single, and it is signed", async () => {
    const quoted = (words: string) =>
      invitationContact("en", {
        first_name: "Teeba",
        kind: "tour",
        pages: 1,
        station: "Food Court",
        words,
      }).tour_line;
    expect(quoted("Meow. (Said by Audi.)")).toContain(
      "“Meow. (Said by Audi.)” We kept"
    );
    expect(quoted("“The past is never dead.” —William Faulkner")).toContain(
      "“‘The past is never dead.’ —William Faulkner.” We kept"
    );
    const built = invitationBroadcast("en", "tour", JOIN, {
      image:
        "https://auibsal.org/api/email/signature?seat=president&date=2026-11-08",
      name: "Shaheen Farjo",
    });
    expect(built.preview).not.toBe("Hello,");
    const html = await render(
      Notice({ blocks: built.blocks, preview: built.preview })
    );
    expect(html).toContain("Shaheen Farjo");
    expect(html).toContain("President, AUIB Society of Arts and Letters");
    expect(html).toContain("/api/email/signature?seat=president");
    expect(html).not.toContain("original sheet");
  });
});

describe("the contacts file Resend imports", () => {
  test("quotes every field and keeps the placeholders' values safe", () => {
    const csv = contactsCsv([
      {
        email: "a.1@auib.edu.iq",
        firstName: "Ahmed",
        properties: {
          greeting: "Hello Ahmed,",
          stop_url: "https://auibsal.org/emails/stop?invite=x.y",
          tour_line: 'typed: “"the past" & <more>”',
        },
      },
    ]);
    expect(csv.split("\n")).toEqual([
      '"email","first_name","stop_url","greeting","tour_line"',
      '"a.1@auib.edu.iq","Ahmed","https://auibsal.org/emails/stop?invite=x.y","Hello Ahmed,","typed: “""the past"" and ‹more›”"',
    ]);
  });
});
