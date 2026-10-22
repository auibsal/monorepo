import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/env", () => ({ env: { TELEGRAM_BOT_TOKEN: "123:abc" } }));
vi.mock("@repo/observability/log", () => ({ log: { warn: vi.fn() } }));

const { telegramToUser } = await import("@/lib/telegram");

const adminWith = (account: unknown) => {
  const update = vi.fn(() => ({ eq: vi.fn() }));
  const admin = {
    schema: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: account }) }),
        }),
        update,
      }),
    }),
  };
  return { admin: admin as never, update };
};

const notice = {
  body: "See you at 6:00 PM",
  lang: "en" as const,
  title: "You're in",
  url: "https://nexus.auibsal.org/events",
};

afterEach(() => vi.unstubAllGlobals());

describe("Telegram copies of notices", () => {
  it("sends to a linked member with notices on", async () => {
    const fetcher = vi.fn(
      async (_url: string, _init: RequestInit) =>
        await Promise.resolve(Response.json({ ok: true, result: {} }))
    );
    vi.stubGlobal("fetch", fetcher);
    const { admin } = adminWith({ notify: true, telegram_id: 42 });
    expect(await telegramToUser(admin, "u1", notice)).toBe(true);
    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(body.chat_id).toBe(42);
    expect(body.text).toBe("<b>You're in</b>\n\nSee you at 6:00 PM");
    expect(body.reply_markup.inline_keyboard[0][0].url).toBe(notice.url);
  });

  it("does nothing when notices are off or nothing is linked", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(await telegramToUser(adminWith(null).admin, "u1", notice)).toBe(
      false
    );
    expect(
      await telegramToUser(
        adminWith({ notify: false, telegram_id: 1 }).admin,
        "u1",
        notice
      )
    ).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("turns notices off when the member blocked the bot", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          description: "Forbidden: bot was blocked by the user",
          error_code: 403,
          ok: false,
        })
      )
    );
    const { admin, update } = adminWith({ notify: true, telegram_id: 42 });
    expect(await telegramToUser(admin, "u1", notice)).toBe(false);
    expect(update).toHaveBeenCalledWith({ notify: false });
  });
});
