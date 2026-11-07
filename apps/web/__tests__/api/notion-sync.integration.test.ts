// @vitest-environment node
/**
 * The Notion sync end to end against a local stack, with an in-memory
 * stand-in for Notion: the officers' copy, programs, events and their
 * Arabic editions published with the permission check, refusals, RSVP
 * counts and canceling.
 * Needs: SUPABASE_INTEGRATION=1 API_URL=… PUBLISHABLE_KEY=… SECRET_KEY=…
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const enabled = Boolean(
  process.env.SUPABASE_INTEGRATION && process.env.SECRET_KEY
);

process.env.SKIP_ENV_VALIDATION = "true";
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.API_URL ?? "http://127.0.0.1:54321";
process.env.SUPABASE_SECRET_KEY = process.env.SECRET_KEY ?? "skipped";
process.env.NEXT_PUBLIC_SITE_URL = "https://site.example";

interface FakePage {
  comments: string[];
  dataSource: string;
  id: string;
  in_trash: boolean;
  last_edited_by: { id: string };
  last_edited_time: string;
  object: "page";
  properties: Record<string, Record<string, unknown>>;
}

/** Turns property values as written into the shape Notion returns. */
const asRead = (props: Record<string, Record<string, unknown>>) =>
  Object.fromEntries(
    Object.entries(props).map(([name, value]) => {
      const [type] = Object.keys(value);
      const v = value[type];
      if (type === "title" || type === "rich_text") {
        return [
          name,
          {
            type,
            [type]: (v as { text: { content: string } }[]).map((t) => ({
              plain_text: t.text.content,
            })),
          },
        ];
      }
      return [name, { type, [type]: v }];
    })
  );

/** Every method as Notion's client has it: returning a promise. */
const promised = <T extends Record<string, (...args: never[]) => unknown>>(
  methods: T
) =>
  Object.fromEntries(
    Object.entries(methods).map(([name, fn]) => [
      name,
      (...args: never[]) => Promise.resolve().then(() => fn(...args)),
    ])
  );

const fakeNotion = (users: { email: string; id: string }[]) => {
  const pages = new Map<string, FakePage>();
  const matches = (p: FakePage, filter: unknown): boolean => {
    if (!filter) {
      return true;
    }
    const f = filter as {
      and?: unknown[];
      or?: unknown[];
      property?: string;
      select?: { equals: string };
    };
    if (f.and) {
      return f.and.every((x) => matches(p, x));
    }
    if (f.or) {
      return f.or.some((x) => matches(p, x));
    }
    const prop = p.properties[f.property ?? ""] as
      | { select?: { name: string } | null }
      | undefined;
    return prop?.select?.name === f.select?.equals;
  };
  const make = (
    dataSource: string,
    props: Record<string, Record<string, unknown>>,
    editor = "bot"
  ) => {
    const id = randomUUID();
    const page: FakePage = {
      comments: [],
      dataSource,
      id,
      in_trash: false,
      last_edited_by: { id: editor },
      last_edited_time: new Date().toISOString(),
      object: "page",
      properties: asRead(props) as FakePage["properties"],
    };
    pages.set(id.replaceAll("-", ""), page);
    return page;
  };
  const find = (id: string) => {
    const page = pages.get(id.replaceAll("-", ""));
    if (!page || page.in_trash) {
      throw Object.assign(new Error("Could not find page"), { status: 404 });
    }
    return page;
  };
  return {
    client: promised({
      // One language per page: an Arabic row's text is Arabic, every other
      // row's English.
      blocksWithTables: (pageId: string) => [
        {
          id: "c1",
          paragraph: {
            rich_text: [
              {
                plain_text:
                  (
                    find(pageId).properties.Language as {
                      select?: { name?: string };
                    }
                  ).select?.name === "Arabic"
                    ? "نص الصفحة."
                    : "Bring a poem.",
              },
            ],
          },
          type: "paragraph",
        },
      ],
      comment: (pageId: string, text: string) => {
        find(pageId).comments.push(text);
        return {};
      },
      createPage: (dataSource: string, props: Record<string, never>) =>
        make(dataSource, props),
      query: (dataSource: string, filter?: object) =>
        [...pages.values()].filter(
          (p) =>
            p.dataSource === dataSource && !p.in_trash && matches(p, filter)
        ),
      trashPage: (id: string) => {
        const page = find(id);
        page.in_trash = true;
        return page;
      },
      updatePage: (id: string, props: Record<string, never>) => {
        const page = find(id);
        Object.assign(page.properties, asRead(props));
        return page;
      },
      user: (id: string) => {
        const u = users.find((x) => x.id === id);
        return u
          ? { id, object: "user", person: { email: u.email }, type: "person" }
          : { id, object: "user", type: "bot" };
      },
      users: () =>
        users.map((u) => ({
          id: u.id,
          name: u.email,
          object: "user",
          person: { email: u.email },
          type: "person",
        })),
    }),
    make,
    pages,
  };
};

describe.skipIf(!enabled)("Notion sync", () => {
  const stamp = Date.now();
  const lead = `events${stamp}@auib.edu.iq`;
  const member = `member${stamp}@auib.edu.iq`;
  const notionUsers = [
    { email: lead, id: `n-lead-${stamp}` },
    { email: member, id: `n-member-${stamp}` },
  ];
  const fake = fakeNotion(notionUsers);
  let admin: Awaited<
    ReturnType<typeof import("@repo/database/admin").createAdminClient>
  >;
  let run: typeof import("@/lib/api/notion/run").runNotionSync;
  let sources: Record<string, string>;
  let leadId = "";
  let salonId = "";

  const getProp = (page: FakePage, name: string) => page.properties[name] ?? {};
  const statusOf = (page: FakePage) =>
    (getProp(page, "Status").select as { name: string } | null)?.name;

  beforeAll(async () => {
    const { createAdminClient } = await import("@repo/database/admin");
    admin = createAdminClient();
    ({ runNotionSync: run } = await import("@/lib/api/notion/run"));
    const { data } = await admin
      .schema("core")
      .from("settings")
      .select("value")
      .eq("key", "notion.data_sources")
      .single();
    sources = data?.value as Record<string, string>;
    // The stand-in starts empty, so start from no links (local stack only).
    await admin.schema("core").from("notion_links").delete().neq("kind", "");
    for (const email of [lead, member]) {
      // biome-ignore lint/performance/noAwaitInLoops: two accounts
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        password: "integration-test-1",
        user_metadata: {
          full_name_en: email === lead ? "Events Lead" : "Member",
        },
      });
      expect(error).toBeNull();
      if (email === lead) {
        leadId = created.user?.id ?? "";
      }
    }
    const { data: salon } = await admin
      .schema("core")
      .from("programmes")
      .select("id")
      .eq("slug", "salon")
      .single();
    salonId = salon?.id ?? "";
    await admin
      .schema("access")
      .from("role_assignments")
      .insert([
        { role: "events_lead", scope_type: "global", user_id: leadId },
        {
          role: "programme_lead",
          scope_id: salonId,
          scope_type: "programme",
          user_id: leadId,
        },
      ]);
  });

  const sync = () => run(fake.client as never);

  test("copies the officers, matching Notion people by email", async () => {
    const state = await sync();
    expect(state).not.toHaveProperty("skipped");
    const officers = [...fake.pages.values()].filter(
      (p) => p.dataSource === sources.officers
    );
    const ours = officers.find(
      (p) => (getProp(p, "AUIB email").email as string) === lead
    );
    expect(ours).toBeDefined();
    expect(getProp(ours as FakePage, "Notion person").people).toEqual([
      { id: `n-lead-${stamp}`, object: "user" },
    ]);
    expect(getProp(ours as FakePage, "Diwan ID").rich_text).toBeDefined();
    expect(
      officers.some(
        (p) => (getProp(p, "AUIB email").email as string) === member
      )
    ).toBe(false);
    // Programs are written in Notion now: none are copied there.
    expect(
      [...fake.pages.values()].filter(
        (p) => p.dataSource === sources.programmes
      )
    ).toHaveLength(0);
  });

  test("publishes a program's row from Notion to its program", async () => {
    const page = fake.make(
      sources.programmes,
      {
        "Diwan ID": { rich_text: [{ text: { content: salonId } }] },
        Language: { select: { name: "English" } },
        Name: { title: [{ text: { content: "Reading with a guest" } }] },
        Rhythm: {
          rich_text: [
            {
              text: { content: `Tuesdays, as the term calendar sets ${stamp}` },
            },
          ],
        },
        Status: { select: { name: "Ready to publish" } },
      },
      `n-lead-${stamp}`
    );
    await sync();
    expect(statusOf(page)).toBe("Published");
    const { data } = await admin
      .schema("core")
      .from("programmes")
      .select("rhythm_en, slug")
      .eq("id", salonId)
      .single();
    expect(data).toEqual({
      rhythm_en: `Tuesdays, as the term calendar sets ${stamp}`,
      slug: "salon",
    });
  });

  test("refuses a document from someone without governance.manage", async () => {
    const page = fake.make(
      sources.documents,
      {
        Audience: { select: { name: "public" } },
        Code: { rich_text: [{ text: { content: "SAL-GOV-06" } }] },
        Slug: { rich_text: [{ text: { content: "accessibility" } }] },
        Status: { select: { name: "Ready to publish" } },
        Title: { title: [{ text: { content: "Accessibility Statement" } }] },
      },
      `n-lead-${stamp}`
    );
    await sync();
    expect(statusOf(page)).toBe("Needs changes");
    expect(page.comments[0]).toContain("does not hold governance.manage");
  });

  const eventProps = (title: string) => ({
    Language: { select: { name: "English" } },
    Status: { select: { name: "Ready to publish" } },
    Summary: { rich_text: [{ text: { content: "An evening of poems." } }] },
    Title: { title: [{ text: { content: title } }] },
    "Way in": { select: { name: "RSVP" } },
    When: { date: { end: null, start: "2031-03-04T18:00:00.000+03:00" } },
  });
  const arabicEdition = (of: string, title: string) => ({
    "Edition of": { relation: [{ id: of }] },
    Language: { select: { name: "Arabic" } },
    Status: { select: { name: "Ready to publish" } },
    Summary: { rich_text: [{ text: { content: "أمسية شعر." } }] },
    Title: { title: [{ text: { content: title } }] },
  });
  const diwanId = (page: FakePage) =>
    (getProp(page, "Diwan ID").rich_text as { plain_text: string }[])[0]
      ?.plain_text;

  test("publishes an event's English row, then its Arabic edition", async () => {
    const page = fake.make(
      sources.events,
      eventProps(`Writing workshop ${stamp}`),
      `n-lead-${stamp}`
    );
    const edition = fake.make(
      sources.events,
      arabicEdition(page.id, "صفحات مفتوحة"),
      `n-lead-${stamp}`
    );
    await sync();
    expect(statusOf(page)).toBe("Published");
    expect(statusOf(edition)).toBe("Published");
    expect(diwanId(edition)).toBe(diwanId(page));
    const { data: event } = await admin
      .schema("events")
      .from("events")
      .select(
        "status, title_ar, summary_ar, body_en, body_ar, created_by, starts_at"
      )
      .eq("id", diwanId(page) ?? "")
      .single();
    expect(event).toMatchObject({
      body_ar: "<p>نص الصفحة.</p>",
      body_en: "<p>Bring a poem.</p>",
      created_by: leadId,
      status: "published",
      summary_ar: "أمسية شعر.",
      title_ar: "صفحات مفتوحة",
    });
    expect(new Date(event?.starts_at ?? "").toISOString()).toBe(
      "2031-03-04T15:00:00.000Z"
    );
  });

  test("refuses an Arabic edition whose English row is not published", async () => {
    const english = fake.make(sources.events, {
      Language: { select: { name: "English" } },
      Status: { select: { name: "Planning" } },
      Title: { title: [{ text: { content: `Draft ${stamp}` } }] },
    });
    const edition = fake.make(
      sources.events,
      arabicEdition(english.id, "مسودة"),
      `n-lead-${stamp}`
    );
    await sync();
    expect(statusOf(edition)).toBe("Needs changes");
    expect(edition.comments[0]).toContain("Publish the English row");
  });

  test("refuses a page edited by someone without the permission, and says why", async () => {
    const page = fake.make(
      sources.events,
      eventProps(`Not mine ${stamp}`),
      `n-member-${stamp}`
    );
    await sync();
    expect(statusOf(page)).toBe("Needs changes");
    expect(page.comments[0]).toContain("does not hold events.manage");
  });

  test("writes the RSVP count back and cancels on request", async () => {
    const page = [...fake.pages.values()].find(
      (p) =>
        p.dataSource === sources.events &&
        statusOf(p) === "Published" &&
        (getProp(p, "Title").title as { plain_text: string }[])[0]
          ?.plain_text === `Writing workshop ${stamp}`
    ) as FakePage;
    const eventId = diwanId(page) as string;
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
    const memberId = users.users.find((u) => u.email === member)?.id as string;
    await admin
      .schema("events")
      .from("rsvps")
      .insert({ event_id: eventId, user_id: memberId });
    await sync();
    expect(getProp(page, "RSVPs").number).toBe(1);

    Object.assign(page.properties, {
      Status: { select: { name: "Cancel on the site" }, type: "select" },
    });
    page.last_edited_by = { id: `n-lead-${stamp}` };
    await sync();
    expect(statusOf(page)).toBe("Canceled");
    const { data: event } = await admin
      .schema("events")
      .from("events")
      .select("status")
      .eq("id", eventId)
      .single();
    expect(event?.status).toBe("cancelled");
  });
});
