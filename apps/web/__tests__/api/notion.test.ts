// @vitest-environment node
import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { pageHtml } = await import("@/lib/api/notion/blocks");
const { createNotion, bareId } = await import("@/lib/api/notion/client");
const { slugify, toInstant } = await import("@/lib/api/notion/props");
const { checkDocument, RETIRED_DOCUMENT_FAMILY } = await import(
  "@/lib/api/notion/rules"
);
const { accessLabel, copyProps, rowValues } = await import(
  "@/lib/api/notion/events"
);
const { COPY_COLUMNS, lastMonth, MEASURES, seasonOf } = await import(
  "@/lib/api/notion/copies"
);
const { needProps, needValues } = await import("@/lib/api/notion/needs");

const rt = (content: string, extra: object = {}) => ({
  plain_text: content,
  ...extra,
});
const block = (type: string, content: string, extra: object = {}) => ({
  id: content,
  type,
  [type]: { rich_text: [rt(content, extra)] },
});

type Props = Record<string, object>;
const page = (properties: Props) => ({
  id: "11111111-2222-3333-4444-555555555555",
  last_edited_time: "2026-10-10T10:00:00.000Z",
  object: "page" as const,
  properties: properties as never,
});
const title = (value: string) => ({ title: [rt(value)], type: "title" });
const text = (value: string) => ({ rich_text: [rt(value)], type: "rich_text" });
const when = (start: string, end: string | null = null) => ({
  date: { end, start },
  type: "date",
});

describe("Notion page text", () => {
  test("is one language: the whole page, with its formatting", () => {
    const html = pageHtml([
      block("paragraph", "Bring a poem", { annotations: { bold: true } }),
      block("bulleted_list_item", "one"),
      block("bulleted_list_item", "two"),
    ] as never);
    expect(html).toBe(
      "<p><strong>Bring a poem</strong></p><ul><li>one</li><li>two</li></ul>"
    );
  });

  test("escapes HTML and keeps only web links", () => {
    const html = pageHtml([
      block("paragraph", "<script>x</script>", { href: "javascript:alert(1)" }),
      block("paragraph", "site", { href: "https://auibsal.org" }),
    ] as never);
    expect(html).toBe(
      '<p>&lt;script&gt;x&lt;/script&gt;</p><p><a href="https://auibsal.org">site</a></p>'
    );
  });
});

describe("one-language pages", () => {
  test("a document's tables carry over, the first row as its header", () => {
    const html = pageHtml([
      block("heading_2", "1. Schedule"),
      {
        children: [
          {
            id: "r1",
            table_row: { cells: [[rt("Data")], [rt("Kept")]] },
            type: "table_row",
          },
          {
            id: "r2",
            table_row: { cells: [[rt("Ballots")], [rt("One year")]] },
            type: "table_row",
          },
        ],
        has_children: true,
        id: "t",
        table: { has_column_header: true },
        type: "table",
      },
    ] as never);
    expect(html).toBe(
      "<h2>1. Schedule</h2><table><tr><th>Data</th><th>Kept</th></tr><tr><td>Ballots</td><td>One year</td></tr></table>"
    );
  });
});

describe("Notion values", () => {
  test("times without an offset are Baghdad time; dates alone are not instants", () => {
    expect(toInstant("2026-10-20T18:00:00.000+03:00")).toBe(
      "2026-10-20T15:00:00.000Z"
    );
    expect(toInstant("2026-10-20T18:00:00")).toBe("2026-10-20T15:00:00.000Z");
    expect(toInstant("2026-10-20")).toBeNull();
  });

  test("slugs are Latin letters, digits and hyphens", () => {
    expect(slugify("Writing workshop: Fall 2026!")).toBe(
      "writing-workshop-fall-2026"
    );
    expect(slugify("أمسية الشعر")).toBe("");
    expect(bareId("11111111-2222-3333-4444-555555555555")).toBe(
      "11111111222233334444555555555555"
    );
  });
});

describe("the one-time import from Notion (Nov 16, 2026)", () => {
  const select = (name: string) => ({ select: { name }, type: "select" });

  test("an event row becomes a draft's values", () => {
    const v = rowValues(
      page({
        Access: select("Members"),
        Capacity: { number: 200, type: "number" },
        Debrief: { type: "url", url: "https://www.notion.so/debrief" },
        Host: select("The Society"),
        Slug: text("general-meeting-2027-02-17"),
        Summary: text("The semester's plans."),
        Title: title("General meeting"),
        Venue: text("Room 101"),
        When: when(
          "2027-02-17T16:00:00.000+03:00",
          "2027-02-17T17:30:00.000+03:00"
        ),
      })
    );
    expect(v).toMatchObject({
      capacity: 200,
      classes: ["member"],
      debrief: "https://www.notion.so/debrief",
      entry: "rsvp",
      host: null,
      slug: "general-meeting-2027-02-17",
      starts_at: "2027-02-17T13:00:00.000Z",
      title: "General meeting",
      venue: "Room 101",
    });
  });

  test("a row without a start time is not brought over; a missing slug is made", () => {
    expect(rowValues(page({ Title: title("Someday") }))).toBeNull();
    const v = rowValues(
      page({
        Title: title("Writing workshop"),
        When: when("2027-04-13T18:00:00.000+03:00"),
      })
    );
    expect(v?.slug).toBe("writing-workshop");
    expect(v?.entry).toBe("rsvp");
  });

  test("a Needs row keeps its item, quantity, date and status", () => {
    const v = needValues(
      page({
        Item: title("Folding chairs"),
        "Needed by": when("2026-12-01"),
        Purpose: text("For the reading"),
        Quantity: { number: 30, type: "number" },
        Status: { status: { name: "Draft" }, type: "status" },
      })
    );
    expect(v).toMatchObject({
      item: "Folding chairs",
      needed_by: "2026-12-01",
      quantity: 30,
      requested_on: null,
      status: "listed",
    });
    expect(needValues(page({ Item: title("") }))).toBeNull();
  });
});

const PERSONAL =
  /(^|[\s,(:_])(user_id|email|phone|contact_\w+|full_name\w*|created_by|author_id|confirmed_by|assigned_by|notes|answers|birth\w*)\b/u;

describe("the read-only copies", () => {
  const ctx = {
    appUrl: "https://auibsal.org/diwan",
    webUrl: "https://auibsal.org",
  };
  const event = {
    classes: ["member", "associate", "honorary", "guest"],
    ends_at: null,
    entry: "rsvp",
    id: "e1",
    lead_id: null,
    slug: "screening",
    starts_at: "2026-11-22T13:00:00.000Z",
    status: "published",
    title_ar: "عرض",
    title_en: "Screening",
    venue_ar: "القاعة",
    venue_en: "The hall",
  };

  test("an event's copy holds title, dates, venue, status, access, lead and links", () => {
    const en = copyProps(ctx, event, "en", "notion-lead");
    expect(Object.keys(en).sort()).toEqual([
      "Access",
      "Diwan",
      "Diwan ID",
      "Language",
      "Lead",
      "Public page",
      "Slug",
      "Status",
      "Title",
      "Venue",
      "When",
    ]);
    expect(en["Public page"]).toEqual({
      url: "https://auibsal.org/events/screening",
    });
    expect(copyProps(ctx, event, "ar", undefined)["Public page"]).toEqual({
      url: "https://auibsal.org/ar/events/screening",
    });
    expect(
      copyProps(ctx, { ...event, status: "draft" }, "en", undefined)
    ).toMatchObject({
      "Public page": { url: null },
      Status: { select: { name: "Planning" } },
    });
    expect(en.Access).toEqual({
      select: { name: "Everyone · Booking required" },
    });
  });

  test("access reads as the two settings (decisions.md, Events: Access)", () => {
    expect(accessLabel({ classes: ["member"], entry: "rsvp" })).toBe(
      "Members only · Booking required"
    );
    expect(accessLabel({ classes: ["member", "guest"], entry: "open" })).toBe(
      "Members and Guests · Open"
    );
    expect(accessLabel({ classes: [], entry: "invite" })).toBe("Invited only");
  });

  test("no copy reads a personal field (decisions.md, Where things live)", () => {
    for (const [copy, columns] of Object.entries(COPY_COLUMNS)) {
      expect({ columns, copy, personal: PERSONAL.test(columns) }).toEqual({
        columns,
        copy,
        personal: false,
      });
    }
  });

  test("the measures are written for the month just ended, on the first", () => {
    expect(lastMonth(new Date("2026-11-30T21:30:00Z"))).toEqual({
      first: true,
      month: "2026-11-01",
    });
    expect(lastMonth(new Date("2026-11-16T12:00:00Z")).first).toBe(false);
    expect(Object.keys(MEASURES)).toHaveLength(5);
    expect(seasonOf("2026-11-22T11:00:00Z")).toBe("Fall 2026");
    expect(seasonOf("2027-03-30T11:00:00Z")).toBe("Spring 2027");
  });

  test("a need's copy names what it is for", () => {
    const props = needProps(
      {
        event_id: null,
        id: "n1",
        item: "Paper",
        needed_by: null,
        program: "typewriter-tour",
        provided_note: null,
        purpose: "",
        quantity: 2,
        requested_on: null,
        status: "listed",
      },
      undefined
    );
    expect(props.For).toEqual({ select: { name: "Typewriter Tour" } });
    expect(props.Status).toEqual({ status: { name: "Draft" } });
  });
});

describe("document rules", () => {
  test("a document row needs its code, address and audience", () => {
    expect(
      checkDocument(
        page({
          Audience: { select: { name: "public" }, type: "select" },
          Code: text("SAL-GOV-04"),
          Slug: text("privacy"),
          Title: title("Privacy Notice"),
        })
      )
    ).toMatchObject({
      ok: true,
      values: { audience: "public", code: "SAL-GOV-04", slug: "privacy" },
    });
    // The retired families (decisions.md) are refused.
    expect(
      checkDocument(
        page({
          Audience: { select: { name: "public" }, type: "select" },
          Code: text("SAL-PLT-03"),
          Slug: text("cookies"),
          Title: title("Cookie and Consent Policy"),
        })
      ).ok
    ).toBe(false);
    // An Arabic edition leaves Audience and Slug blank: the English row's
    // Audience is given to it (decisions.md).
    const arabic = page({
      Code: text("SAL-GOV-04"),
      Language: { select: { name: "Arabic" }, type: "select" },
      Title: title("إشعار الخصوصية"),
    });
    expect(checkDocument(arabic, "internal")).toMatchObject({
      ok: true,
      values: { audience: "internal", code: "SAL-GOV-04" },
    });
    expect(checkDocument(arabic).ok).toBe(false);
    expect(RETIRED_DOCUMENT_FAMILY.test("SAL-BRD-01")).toBe(true);
    expect(RETIRED_DOCUMENT_FAMILY.test("SAL-MED-02")).toBe(false);
    const bad = checkDocument(page({ Code: text("PLT3"), Title: title("X") }));
    expect(bad.ok ? [] : bad.problems).toEqual(
      expect.arrayContaining([
        "Set the Code, for example SAL-GOV-01 (families GOV, EXB, EVT, MEM, PTN, MED, ART, EDT).",
        "Set Audience to public or internal.",
      ])
    );
  });
});

describe("Notion client", () => {
  test("waits and retries when Notion is rate limiting", async () => {
    vi.useFakeTimers();
    const calls: string[] = [];
    const fetchImpl = vi.fn((url: string | URL | Request) => {
      calls.push(String(url));
      return Promise.resolve(
        calls.length === 1
          ? new Response("{}", { headers: { "retry-after": "1" }, status: 429 })
          : Response.json({ id: "u1", object: "user" })
      );
    });
    const notion = createNotion("secret_token_for_tests", fetchImpl as never);
    const pending = notion.user("u1");
    await vi.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toMatchObject({ id: "u1" });
    expect(calls).toHaveLength(2);
    vi.useRealTimers();
  });

  test("sends the API version and turns errors into NotionError", async () => {
    const fetchImpl = vi.fn((_url: unknown, init?: RequestInit) => {
      const headers = (init?.headers ?? {}) as Record<string, string>;
      expect(headers["Notion-Version"]).toBe("2026-03-11");
      return Promise.resolve(
        Response.json(
          { code: "object_not_found", message: "Could not find page" },
          { status: 404 }
        )
      );
    });
    const notion = createNotion("secret_token_for_tests", fetchImpl as never);
    await expect(notion.trashPage("p1")).rejects.toMatchObject({
      code: "object_not_found",
      status: 404,
    });
  });
});
