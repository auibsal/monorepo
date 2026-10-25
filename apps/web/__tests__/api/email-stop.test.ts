// @vitest-environment node
import { noticeText } from "@repo/email/templates/notice";
import { beforeAll, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const USER = "0b6f4a1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b";

describe("the members' stop link", () => {
  beforeAll(() => {
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test_only";
  });

  test("names the member it was made for", async () => {
    const { stopToken, stopTokenUser } = await import("@/lib/api/email-stop");
    expect(stopTokenUser(stopToken(USER))).toBe(USER);
  });

  test("can't be pointed at someone else or altered", async () => {
    const { stopToken, stopTokenUser } = await import("@/lib/api/email-stop");
    const other = "1b6f4a1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b";
    const [, signature] = stopToken(USER).split(".");
    expect(stopTokenUser(`${other}.${signature}`)).toBeNull();
    expect(stopTokenUser(`${USER}.x${signature?.slice(1)}`)).toBeNull();
    expect(stopTokenUser("nonsense")).toBeNull();
  });
});

describe("plain-text emails", () => {
  test("carry the heading, every line, the link and the footer", () => {
    const text = noticeText({
      blocks: [
        {
          action: { href: "https://auibsal.org/events/book", label: "Open" },
          heading: "You're booked",
          lang: "en",
          paragraphs: ["Tuesday, October 13 · 6:00 PM"],
        },
      ],
    });
    expect(text).toContain("You're booked");
    expect(text).toContain("Tuesday, October 13 · 6:00 PM");
    expect(text).toContain("Open: https://auibsal.org/events/book");
    expect(text).toContain("auibsal.org.");
  });
});
