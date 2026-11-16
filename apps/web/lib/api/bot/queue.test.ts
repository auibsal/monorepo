import { Api, GrammyError } from "grammy";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const calls: { args: unknown; name: string }[] = [];
let readRows: unknown[][] = [];

const chain = (name: string) => {
  const record =
    (step: string) =>
    (...args: unknown[]) => {
      calls.push({ args, name: `${name}.${step}` });
      return builder;
    };
  const builder: Record<string, unknown> = {
    eq: record("eq"),
    maybeSingle: () => Promise.resolve({ data: null }),
    // biome-ignore lint/suspicious/noThenProperty: a thenable stand-in for the query builder
    then: (resolve: (value: unknown) => void) => resolve({ error: null }),
    update: record("update"),
  };
  return builder;
};

vi.mock("./db", () => ({
  db: () => ({
    schema: () => ({
      from: (table: string) => chain(table),
      rpc: (name: string, args: unknown) => {
        calls.push({ args, name });
        if (name === "telegram_read") {
          return Promise.resolve({ data: readRows.shift() ?? [], error: null });
        }
        return Promise.resolve({ data: true, error: null });
      },
    }),
  }),
}));

const { forClaim, QUEUED_ID, queueing, sendQueued, whenBlocked } = await import(
  "./queue"
);

const named = (name: string) => calls.filter((c) => c.name === name);

const fakeApi = (answer: (method: string) => unknown) => {
  const api = new Api("123:abc");
  api.config.use((_prev, method) => {
    const value = answer(method);
    if (value instanceof Error) {
      return Promise.reject(value);
    }
    return Promise.resolve({ ok: true, result: value } as never);
  });
  return api;
};

const telegramError = (code: number) =>
  new GrammyError(
    "refused",
    { description: "refused", error_code: code, ok: false },
    "sendMessage",
    {}
  );

beforeEach(() => {
  calls.length = 0;
  readRows = [];
});

describe("planning with the queued Api", () => {
  it("queues a post with its claim and answers with a placeholder", async () => {
    const api = queueing(fakeApi(() => ({ id: 1 })));
    const message = await forClaim(
      { chat_id: -100, kind: "event", ref: "e1" },
      () => api.sendMessage(-100, "Hello")
    );
    expect(message.message_id).toBe(QUEUED_ID);
    const [sent] = named("telegram_enqueue");
    expect(sent?.args).toEqual({
      messages: [
        {
          blocked: undefined,
          claim: { chat_id: -100, kind: "event", ref: "e1" },
          method: "sendMessage",
          payload: { chat_id: -100, text: "Hello" },
        },
      ],
    });
  });

  it("carries what to turn off if the member blocked Hudhud", async () => {
    const api = queueing(fakeApi(() => ({ id: 1 })));
    await whenBlocked({ reminders: false }, () => api.sendMessage(42, "Hi"));
    const [sent] = named("telegram_enqueue");
    const { messages } = (sent?.args ?? { messages: [] }) as {
      messages: { blocked: unknown }[];
    };
    expect(messages[0]?.blocked).toEqual({ reminders: false });
  });

  it("lets reads through to Telegram", async () => {
    const api = queueing(fakeApi(() => ({ id: -100, type: "supergroup" })));
    const chat = await api.getChat(-100);
    expect(chat.id).toBe(-100);
    expect(named("telegram_enqueue")).toHaveLength(0);
  });
});

describe("sending what waits", () => {
  const row = (msg_id: number, read_ct: number, extra = {}) => ({
    message: {
      method: "sendMessage",
      payload: { chat_id: 42, text: "Hi" },
      ...extra,
    },
    msg_id,
    read_ct,
  });
  const later = () => Date.now() + 5000;

  it("deletes a message once Telegram confirms it, and records the post", async () => {
    readRows = [
      [
        row(1, 1, {
          claim: { chat_id: -100, kind: "event", ref: "e1" },
          payload: { chat_id: -100, text: "Hi" },
        }),
      ],
    ];
    const sent = await sendQueued(
      fakeApi(() => ({ message_id: 77 })),
      later()
    );
    expect(sent).toBe(1);
    expect(named("telegram_done")[0]?.args).toEqual({ msg_id: 1 });
    expect(named("telegram_posts.update")[0]?.args).toEqual([
      { message_id: 77 },
    ]);
  });

  it("sets aside a message on its sixth read", async () => {
    readRows = [[row(2, 6)]];
    await sendQueued(
      fakeApi(() => ({ message_id: 1 })),
      later()
    );
    expect(named("telegram_set_aside")[0]?.args).toEqual({ msg_id: 2 });
    expect(named("telegram_done")).toHaveLength(0);
  });

  it("turns off the switch when the member blocked Hudhud, and drops the message", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    readRows = [[row(3, 1, { blocked: { notify: false } })]];
    await sendQueued(
      fakeApi(() => telegramError(403)),
      later()
    );
    expect(named("telegram_accounts.update")[0]?.args).toEqual([
      { notify: false },
    ]);
    expect(named("telegram_done")[0]?.args).toEqual({ msg_id: 3 });
    warn.mockRestore();
  });

  it("sets aside a message Telegram refuses for itself", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    readRows = [[row(4, 1)]];
    await sendQueued(
      fakeApi(() => telegramError(400)),
      later()
    );
    expect(named("telegram_set_aside")[0]?.args).toEqual({ msg_id: 4 });
    warn.mockRestore();
  });

  it("leaves a message that failed for now to reappear", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    readRows = [[row(5, 1)]];
    await sendQueued(
      fakeApi(() => new Error("network")),
      later()
    );
    expect(named("telegram_done")).toHaveLength(0);
    expect(named("telegram_set_aside")).toHaveLength(0);
    warn.mockRestore();
  });

  it("reads nothing once its time is up", async () => {
    readRows = [[row(6, 1)]];
    await sendQueued(
      fakeApi(() => ({ message_id: 1 })),
      Date.now() - 1
    );
    expect(named("telegram_read")).toHaveLength(0);
  });
});
