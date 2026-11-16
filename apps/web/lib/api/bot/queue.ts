import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { type Api, GrammyError, InputFile } from "grammy";
import { log } from "@/lib/observability/log";
import { db } from "./db";

/**
 * Hudhud's posts through Supabase Queues (decisions.md, The site:
 * Background jobs; migration 20261116001400_telegram_queue.sql).
 *
 * The Telegram job plans with a queued Api: a post or a pin becomes a
 * message on the queue `telegram` instead of a call, answered at once with
 * a placeholder. Then `sendQueued` reads a few at a time, each hidden from
 * other runs for 40 seconds, sends it, and deletes it once Telegram
 * confirms. A run that dies leaves its messages to reappear; one that
 * fails five times is set aside (archived), and sal-platform-health reports
 * it.
 */

/** The calls that wait in the queue: posts and pins, never a read. */
const QUEUED = new Set([
  "sendMessage",
  "sendPhoto",
  "pinChatMessage",
  "unpinChatMessage",
]);

/** The id a queued post answers with; the real one comes when it's sent. */
export const QUEUED_ID = -1;

/** Hidden from other runs while one sends it (inside the route's 60 s). */
const HIDDEN_SECONDS = 40;
const BATCH = 10;
/** Tries before a message is set aside. */
const MAX_TRIES = 5;

/** The group post a message fulfills (core.telegram_posts). */
interface Claim {
  chat_id: number;
  kind: string;
  ref: string;
}

/** What turns off when the member has blocked Hudhud (a 403). */
type WhenBlocked = Partial<Record<"notify" | "paper" | "reminders", false>>;

interface Context {
  blocked?: WhenBlocked;
  claim?: Claim;
}

interface Message {
  blocked?: WhenBlocked;
  claim?: Claim;
  method: string;
  payload: Record<string, unknown>;
}

const context = new AsyncLocalStorage<Context>();

/** Runs a group post's send with its claim, so the sender records the id. */
export const forClaim = <T>(claim: Claim, run: () => Promise<T>) =>
  context.run({ ...context.getStore(), claim }, run);

/** Runs a member's message with what to turn off if they blocked Hudhud. */
export const whenBlocked = <T>(blocked: WhenBlocked, run: () => Promise<T>) =>
  context.run({ ...context.getStore(), blocked }, run);

/** The claim of the post being planned, if any. */
export const currentClaim = () => context.getStore()?.claim;

const FILE = "$file";

/** A file (the ticket's QR) kept in the message as base64. */
const encode = (payload: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if (value instanceof InputFile) {
        const data = (value as unknown as { fileData: unknown }).fileData;
        if (data instanceof Uint8Array) {
          return [
            key,
            {
              [FILE]: Buffer.from(data).toString("base64"),
              name: value.filename ?? "file",
            },
          ];
        }
      }
      return [key, value];
    })
  );

const decode = (payload: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if (value && typeof value === "object" && FILE in value) {
        const file = value as { [FILE]: string; name: string };
        return [
          key,
          new InputFile(Buffer.from(file[FILE], "base64"), file.name),
        ];
      }
      return [key, value];
    })
  );

/** Puts messages on the queue. */
export const enqueue = async (messages: Message[]) => {
  if (!messages.length) {
    return;
  }
  const { error } = await db()
    .schema("api")
    .rpc("telegram_enqueue", { messages: messages as never });
  if (error) {
    throw error;
  }
};

/**
 * Makes `api` plan instead of send: posts and pins go on the queue, each
 * at once (a run that dies after planning loses nothing), with the claim
 * and the block switch of the code that made them.
 */
export const queueing = (api: Api) => {
  api.config.use(async (prev, method, payload, signal) => {
    if (!QUEUED.has(method)) {
      return prev(method, payload, signal);
    }
    const store = context.getStore();
    await enqueue([
      {
        blocked: store?.blocked,
        claim: store?.claim,
        method,
        payload: encode(payload as Record<string, unknown>),
      },
    ]);
    const chat = (payload as { chat_id?: number }).chat_id ?? 0;
    return {
      ok: true,
      result: method.startsWith("send")
        ? { chat: { id: chat }, date: 0, message_id: QUEUED_ID }
        : true,
    } as never;
  });
  return api;
};

const posts = () => db().schema("api").from("telegram_posts");

/** Pins a sent announcement and unpins the one before (feeds.ts). */
const pinAnnouncement = async (api: Api, claim: Claim) => {
  const { data } = await posts()
    .select("message_id")
    .eq("chat_id", claim.chat_id)
    .eq("kind", claim.kind)
    .eq("ref", claim.ref)
    .maybeSingle();
  if (!data?.message_id) {
    // The post isn't sent yet: this comes back after it.
    throw new Error("The announcement isn't sent yet");
  }
  const { data: before } = await posts()
    .select("message_id")
    .eq("chat_id", claim.chat_id)
    .eq("kind", "announcement")
    .not("message_id", "is", null)
    .neq("message_id", data.message_id)
    .order("posted_at", { ascending: false })
    .limit(1);
  const previous = before?.[0]?.message_id;
  await Promise.all([
    previous
      ? api.unpinChatMessage(claim.chat_id, previous).catch(() => undefined)
      : undefined,
    api
      .pinChatMessage(claim.chat_id, data.message_id, {
        disable_notification: true,
      })
      .catch(() => undefined),
  ]);
};

/** The pin of an announcement, planned once its post is queued. */
export const PIN_ANNOUNCEMENT = "pinAnnouncement";

const perform = async (api: Api, message: Message) => {
  if (message.method === PIN_ANNOUNCEMENT && message.claim) {
    await pinAnnouncement(api, message.claim);
    return;
  }
  const result = (await (
    api.raw as unknown as Record<
      string,
      (payload: Record<string, unknown>) => Promise<unknown>
    >
  )[message.method]?.(decode(message.payload))) as
    | { message_id?: number }
    | undefined;
  if (message.claim && result?.message_id) {
    await posts()
      .update({ message_id: result.message_id })
      .eq("chat_id", message.claim.chat_id)
      .eq("kind", message.claim.kind)
      .eq("ref", message.claim.ref);
  }
};

const done = (id: number) =>
  db().schema("api").rpc("telegram_done", { msg_id: id });
const setAside = (id: number) =>
  db().schema("api").rpc("telegram_set_aside", { msg_id: id });

/** Whether a failure is the request's own and won't change on a retry. */
const permanent = (error: unknown) =>
  error instanceof GrammyError && error.error_code === 400;

interface Row {
  message: Message;
  msg_id: number;
  read_ct: number;
}

/** One message: sent and deleted, or what its failure calls for. */
const handle = async (api: Api, row: Row) => {
  if (row.read_ct > MAX_TRIES) {
    await setAside(row.msg_id);
    return false;
  }
  try {
    await perform(api, row.message);
    await done(row.msg_id);
    return true;
  } catch (failure) {
    const chat = Number(row.message.payload.chat_id ?? 0);
    const blocked =
      failure instanceof GrammyError && failure.error_code === 403 && chat > 0;
    if (blocked && row.message.blocked) {
      await db()
        .schema("api")
        .from("telegram_accounts")
        .update(row.message.blocked)
        .eq("telegram_id", chat);
    }
    if (blocked) {
      await done(row.msg_id);
    } else if (permanent(failure)) {
      await setAside(row.msg_id);
    }
    log.warn("queued post failed", {
      method: row.message.method,
      tries: row.read_ct,
    });
    return false;
  }
};

/** Reads the next few, hidden from other runs while this one sends them. */
const nextBatch = async () => {
  const { data, error } = await db()
    .schema("api")
    .rpc("telegram_read", { hidden_for: HIDDEN_SECONDS, how_many: BATCH });
  if (error) {
    throw error;
  }
  return (data ?? []) as unknown as Row[];
};

/**
 * Sends what waits, a few at a time, until `until` (ms since the epoch):
 * each message deleted once Telegram confirms it; a member who blocked
 * Hudhud has the message's switch turned off; a message refused for itself,
 * or failing a fifth time, is set aside. One left unsent stays hidden and
 * reappears for the next run.
 */
export const sendQueued = async (api: Api, until: number) => {
  let sent = 0;
  while (Date.now() < until) {
    // biome-ignore lint/performance/noAwaitInLoops: one batch at a time, within the run's time
    const rows = await nextBatch();
    if (!rows.length) {
      break;
    }
    for (const row of rows) {
      if (Date.now() >= until) {
        break;
      }
      // biome-ignore lint/performance/noAwaitInLoops: Telegram limits each chat; one at a time, in order
      if (await handle(api, row)) {
        sent += 1;
      }
    }
  }
  return sent;
};
