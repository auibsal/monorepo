// @vitest-environment node
/**
 * The Notion sync end to end against a local stack, with an in-memory
 * stand-in for Notion: the officers' copy, a document refused without the
 * permission, the one-time import of Notion's events (Nov 16, 2026) and
 * the read-only copy of the site's events, which nothing typed in Notion
 * changes.
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
      const [type = ""] = Object.keys(value);
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
  const changes: { body: object; id: string; kind: string }[] = [];
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
    changes,
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
      // The database that holds each data source, and what the sync asked
      // of either (the description and lock are the database's).
      dataSource: (id: string) => ({
        parent: { database_id: `db-${id}`, type: "database_id" },
      }),
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
      updateDatabase: (id: string, body: object) => {
        changes.push({ body, id, kind: "database" });
        return {};
      },
      updateDataSource: (id: string, body: object) => {
        changes.push({ body, id, kind: "data_source" });
        return {};
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
  let sources: Record<
    "documents" | "events" | "needs" | "officers" | "programmes",
    string
  >;
  let leadId = "";
  let memberId = "";
  let salonId = "";

  const getProp = (page: FakePage, name: string) => page.properties[name] ?? {};
  const diwanId = (page: FakePage) =>
    (getProp(page, "Diwan ID").rich_text as { plain_text: string }[])[0]
      ?.plain_text;
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
    sources = data?.value as typeof sources;
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
      } else {
        memberId = created.user?.id ?? "";
      }
    }
    const { data: salon } = await admin
      .schema("core")
      .from("programmes")
      .select("id")
      .eq("slug", "company")
      .single();
    salonId = salon?.id ?? "";
    const { error: roleError } = await admin
      .schema("access")
      .from("role_assignments")
      .insert([
        { role: "programme_lead", scope_type: "global", user_id: leadId },
        {
          role: "programme_lead",
          scope_id: salonId,
          scope_type: "programme",
          user_id: leadId,
        },
      ]);
    expect(roleError).toBeNull();
  });

  const sync = () => run(fake.client as never);

  test("copies the officers, matching Notion people by email without writing it", async () => {
    const state = await sync();
    expect(state).not.toHaveProperty("skipped");
    const officers = [...fake.pages.values()].filter(
      (p) => p.dataSource === sources.officers
    );
    const ours = officers.find((p) => diwanId(p) === leadId);
    expect(ours).toBeDefined();
    expect(getProp(ours as FakePage, "Notion person").people).toEqual([
      { id: `n-lead-${stamp}`, object: "user" },
    ]);
    // No personal data in Notion: the address is never written.
    expect((ours as FakePage).properties["AUIB email"]).toBeUndefined();
    expect(officers.some((p) => diwanId(p) === memberId)).toBe(false);
    // Programs are written in Notion now: none are copied there.
    expect(
      [...fake.pages.values()].filter(
        (p) => p.dataSource === sources.programmes
      )
    ).toHaveLength(0);
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

  const titleOf = (page: FakePage) =>
    (getProp(page, "Title").title as { plain_text: string }[])[0]?.plain_text;

  test("brings over what only Notion held, once, as drafts with their lead", async () => {
    const english = fake.make(sources.events, {
      Access: { select: { name: "Members" } },
      Language: { select: { name: "English" } },
      Lead: { people: [{ id: `n-lead-${stamp}`, object: "user" }] },
      Status: { select: { name: "Planning" } },
      Summary: { rich_text: [{ text: { content: "The semester's plans." } }] },
      Title: { title: [{ text: { content: `General meeting ${stamp}` } }] },
      Venue: { rich_text: [{ text: { content: "Room 101" } }] },
      When: { date: { end: null, start: "2031-03-04T16:00:00.000+03:00" } },
    });
    fake.make(sources.events, {
      "Edition of": { relation: [{ id: english.id }] },
      Language: { select: { name: "Arabic" } },
      Title: { title: [{ text: { content: "الاجتماع العام" } }] },
    });
    // The import runs until it has finished once.
    await admin
      .schema("core")
      .from("settings")
      .delete()
      .eq("key", "notion.imported");
    await sync();
    const { data: link } = await admin
      .schema("core")
      .from("notion_links")
      .select("record_key")
      .eq("kind", "event")
      .eq("notion_page_id", english.id.replaceAll("-", ""))
      .single();
    const { data: event } = await admin
      .schema("events")
      .from("events")
      .select(
        "status, entry, classes, lead_id, title_ar, body_en, body_ar, starts_at"
      )
      .eq("id", link?.record_key ?? "")
      .single();
    expect(event).toMatchObject({
      body_ar: "<p>نص الصفحة.</p>",
      body_en: "<p>Bring a poem.</p>",
      classes: ["member"],
      entry: "rsvp",
      lead_id: leadId,
      status: "draft",
      title_ar: "الاجتماع العام",
    });
    expect(new Date(event?.starts_at ?? "").toISOString()).toBe(
      "2031-03-04T13:00:00.000Z"
    );
  });

  test("copies the site's events to Notion, and nothing typed there is read", async () => {
    const { data: made, error } = await admin
      .schema("events")
      .from("events")
      .insert({
        entry: "rsvp",
        lead_id: leadId,
        slug: `reading-${stamp}`,
        starts_at: "2031-04-01T15:00:00.000Z",
        status: "published",
        title_ar: "قراءة",
        title_en: `A reading ${stamp}`,
        venue_en: "Library 47",
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    await sync();
    const copies = [...fake.pages.values()].filter(
      (p) => p.dataSource === sources.events && diwanId(p) === made?.id
    );
    expect(copies).toHaveLength(2);
    const english = copies.find((p) => titleOf(p) === `A reading ${stamp}`);
    expect(english).toBeDefined();
    expect(statusOf(english as FakePage)).toBe("Published");
    expect(getProp(english as FakePage, "Lead").people).toEqual([
      { id: `n-lead-${stamp}`, object: "user" },
    ]);
    // Someone edits the copy in Notion: the site keeps its own, and the
    // next change on the site writes the row again.
    Object.assign((english as FakePage).properties, {
      Title: { title: [{ plain_text: "Typed in Notion" }], type: "title" },
    });
    await sync();
    const { data: still } = await admin
      .schema("events")
      .from("events")
      .select("title_en")
      .eq("id", made?.id ?? "")
      .single();
    expect(still?.title_en).toBe(`A reading ${stamp}`);
    await admin
      .schema("events")
      .from("events")
      .update({ venue_en: "Library 48" })
      .eq("id", made?.id ?? "");
    await sync();
    expect(titleOf(english as FakePage)).toBe(`A reading ${stamp}`);
  });

  test("copies needs with their standing activity, and locks both copies once", async () => {
    const { data: tour } = await admin
      .schema("core")
      .from("programmes")
      .select("id")
      .eq("slug", "typewriter-tour")
      .single();
    const { data: need, error } = await admin
      .schema("programmes")
      .from("needs")
      .insert({
        item: `Typewriter ribbons ${stamp}`,
        programme_id: tour?.id ?? null,
        quantity: 3,
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    // Imported but not yet locked (the import test above starts the import
    // over, which unlocks the copies too).
    const { data: imported } = await admin
      .schema("core")
      .from("settings")
      .select("value")
      .eq("key", "notion.imported")
      .single();
    const {
      eventsLocked: _events,
      needsLocked: _needs,
      ...unlocked
    } = (imported?.value ?? {}) as Record<string, string>;
    await admin
      .schema("core")
      .from("settings")
      .update({ value: unlocked })
      .eq("key", "notion.imported");
    fake.changes.length = 0;
    const state = await sync();
    // No step failed: a failing step only adds a line here.
    expect("problems" in state ? state.problems : []).toEqual([]);
    // The next sync leaves the locked copies alone.
    await sync();
    const { data: link } = await admin
      .schema("core")
      .from("notion_links")
      .select("notion_page_id")
      .eq("kind", "need")
      .eq("record_key", need?.id ?? "")
      .single();
    const copy = [...fake.pages.values()].find(
      (p) =>
        p.dataSource === sources.needs &&
        p.id.replaceAll("-", "") === link?.notion_page_id?.replaceAll("-", "")
    );
    expect(copy).toBeDefined();
    expect(
      (getProp(copy as FakePage, "For").select as { name: string } | null)?.name
    ).toBe("Typewriter Tour");
    // Each copy: its data source loses the site's own properties, and its
    // database takes the note and the lock (never the data source).
    for (const source of [sources.events, sources.needs]) {
      const onSource = fake.changes.filter(
        (c) => c.kind === "data_source" && c.id === source
      );
      expect(onSource).toHaveLength(1);
      expect(onSource[0]?.body).not.toHaveProperty("description");
      const onDatabase = fake.changes.filter(
        (c) => c.kind === "database" && c.id === `db-${source}`
      );
      expect(onDatabase).toHaveLength(1);
      expect(onDatabase[0]?.body).toMatchObject({ is_locked: true });
      expect(onDatabase[0]?.body).toHaveProperty("description");
    }
  });
});
