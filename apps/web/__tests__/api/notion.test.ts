// @vitest-environment node
import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { pageBodies, pageHtml } = await import("@/lib/api/notion/blocks");
const { createNotion, bareId } = await import("@/lib/api/notion/client");
const { slugify, toInstant } = await import("@/lib/api/notion/props");
const {
  checkArabicEdition,
  checkDocument,
  checkEvent,
  checkProgram,
  checkWaraq,
  languageOf,
} = await import("@/lib/api/notion/rules");

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
  test("splits English and Arabic under their headings, with formatting", () => {
    const { ar, en } = pageBodies([
      block("heading_2", "English"),
      block("paragraph", "Bring a poem", { annotations: { bold: true } }),
      block("bulleted_list_item", "one"),
      block("bulleted_list_item", "two"),
      block("heading_2", "العربية"),
      block("paragraph", "أحضر قصيدة"),
    ] as never);
    expect(en).toBe(
      "<p><strong>Bring a poem</strong></p><ul><li>one</li><li>two</li></ul>"
    );
    expect(ar).toBe("<p>أحضر قصيدة</p>");
  });

  test("escapes HTML and keeps only web links", () => {
    const { en } = pageBodies([
      block("paragraph", "<script>x</script>", { href: "javascript:alert(1)" }),
      block("paragraph", "site", { href: "https://auibsal.org" }),
    ] as never);
    expect(en).toBe(
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
    expect(slugify("Bad Poetry Night: Fall 2026!")).toBe(
      "bad-poetry-night-fall-2026"
    );
    expect(slugify("أمسية الشعر")).toBe("");
    expect(bareId("11111111-2222-3333-4444-555555555555")).toBe(
      "11111111222233334444555555555555"
    );
  });
});

describe("publishing rules", () => {
  const programmes = new Map([["aaaaaaaabbbbccccddddeeeeeeeeeeee", "prog-1"]]);

  test("a complete event passes, with its program mapped to the Diwan", () => {
    const result = checkEvent(
      page({
        Capacity: { number: 40, type: "number" },
        Program: {
          relation: [{ id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" }],
          type: "relation",
        },
        Summary: text("Bring a poem."),
        Title: title("Open Pages"),
        When: when(
          "2026-10-20T18:00:00.000+03:00",
          "2026-10-20T20:00:00.000+03:00"
        ),
      }),
      programmes
    );
    expect(result).toMatchObject({
      ok: true,
      values: {
        capacity: 40,
        ends_at: "2026-10-20T17:00:00.000Z",
        programme_id: "prog-1",
        slug: "open-pages",
        starts_at: "2026-10-20T15:00:00.000Z",
      },
    });
  });

  test("an event without a start time or a Latin slug says what to fix", () => {
    const result = checkEvent(
      page({
        Summary: text("Bring a poem."),
        Title: title("أمسية"),
        When: when("2026-10-20"),
      }),
      programmes
    );
    expect(result.ok).toBe(false);
    const problems = result.ok ? [] : result.problems;
    expect(problems).toEqual(
      expect.arrayContaining([
        "Add a start time to When, not only a date.",
        expect.stringContaining("Set a Slug in Latin letters"),
      ])
    );
    // One language per row: the English row never asks for Arabic.
    expect(problems.join(" ")).not.toContain("Arabic");
  });

  test("an Arabic edition is its own row, linked to its English row", () => {
    const edition = page({
      "Edition of": {
        relation: [{ id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" }],
        type: "relation",
      },
      Language: { select: { name: "Arabic" }, type: "select" },
      Title: title("صفحات مفتوحة"),
      Venue: text("المكتبة"),
    });
    expect(languageOf(edition)).toBe("ar");
    expect(checkArabicEdition(edition)).toEqual({
      ok: true,
      values: {
        of: "aaaaaaaabbbbccccddddeeeeeeeeeeee",
        summary: null,
        title: "صفحات مفتوحة",
        venue: "المكتبة",
      },
    });
    const loose = checkArabicEdition(page({ Title: title("صفحات") }));
    expect(loose.ok ? [] : loose.problems).toContain(
      "An Arabic edition links exactly one English row in Edition of."
    );
  });

  test("a program row gives its name, rhythm and summary", () => {
    expect(
      checkProgram(
        page({
          Name: title("Listening Room"),
          Rhythm: text("Tuesdays, every fourth week"),
          Summary: text("An album played in full, then talked about."),
        })
      )
    ).toMatchObject({
      ok: true,
      values: { rhythm: "Tuesdays, every fourth week", slug: "listening-room" },
    });
  });

  test("a document row needs its code, address and audience", () => {
    expect(
      checkDocument(
        page({
          Audience: { select: { name: "public" }, type: "select" },
          Code: text("SAL-PLT-03"),
          Slug: text("cookies"),
          Title: title("Cookie and Consent Policy"),
        })
      )
    ).toMatchObject({
      ok: true,
      values: { audience: "public", code: "SAL-PLT-03", slug: "cookies" },
    });
    const bad = checkDocument(page({ Code: text("PLT3"), Title: title("X") }));
    expect(bad.ok ? [] : bad.problems).toEqual(
      expect.arrayContaining([
        "Set the Code, for example SAL-GOV-01.",
        "Set Audience to public or internal.",
      ])
    );
  });

  test("a Waraq page needs its desk and both titles", () => {
    const desk = (name: string) => ({
      select: { name },
      type: "select",
    });
    expect(
      checkWaraq(page({ Title: title("Book drive results") }))
    ).toMatchObject({ ok: false });
    expect(
      checkWaraq(
        page({
          Desk: desk("News"),
          Excerpt: text("Second Chapter collected books."),
          Title: title("Book drive results"),
          "Title (Arabic)": text("نتائج حملة الكتب"),
        })
      )
    ).toMatchObject({
      ok: true,
      values: { deck_en: "Second Chapter collected books.", desk: "news" },
    });
  });

  test("a News post page goes to the News desk, dated for 9:00 AM Baghdad time", () => {
    const result = checkWaraq(
      page({
        "Publish on": {
          date: { end: null, start: "2030-01-05" },
          type: "date",
        },
        Title: title("Edition 1 is out"),
        "Title (Arabic)": text("صدر الإصدار الأول"),
      }),
      "news"
    );
    expect(result).toMatchObject({
      ok: true,
      values: { desk: "news", publish_at: "2030-01-05T06:00:00.000Z" },
    });
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
