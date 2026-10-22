/**
 * The bot end to end against a local stack, with Telegram replaced by a
 * recorder: linking, RSVP through the member's own rules, the daily word,
 * connecting a group, topics, the scheduled posts and a join request.
 * Needs: SUPABASE_INTEGRATION=1 API_URL=… PUBLISHABLE_KEY=… SECRET_KEY=…
 */
import { createHash } from "node:crypto";
import type { Database } from "@repo/database";
import { createClient } from "@supabase/supabase-js";
import type { Update } from "grammy/types";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const url = process.env.API_URL ?? "http://127.0.0.1:54321";
const publishableKey = process.env.PUBLISHABLE_KEY ?? "";
const secretKey = process.env.SECRET_KEY ?? "";
const enabled = Boolean(
  process.env.SUPABASE_INTEGRATION && publishableKey && secretKey
);

const loadBot = async () =>
  (await import("@/bot")).createBot(`123456:${"A".repeat(35)}`, "sal_test_bot");

interface Call {
  method: string;
  payload: Record<string, unknown>;
}

describe.skipIf(!enabled)("Hudhud", () => {
  const stamp = Date.now();
  const tgUser = 700_000_000 + (stamp % 1_000_000);
  const stranger = tgUser + 1;
  const chatId = -1_000_000_000_000 - (stamp % 1_000_000);
  const email = `tg${stamp}@auib.edu.iq`;
  const password = "integration-test-1";
  const admin = createClient<Database>(url, secretKey || "skipped", {
    auth: { persistSession: false },
  });
  const calls: Call[] = [];
  let userId = "";
  let eventId = "";
  let messageId = 1;
  // Imported after the environment is set.
  let bot: Awaited<ReturnType<typeof loadBot>>;
  let runFeeds: (api: unknown, username: string) => Promise<{ posted: number }>;

  const fake = (method: string, payload: Record<string, unknown>) => {
    if (method === "getChatMember") {
      return {
        status: payload.user_id === tgUser ? "creator" : "member",
        user: { first_name: "X", id: payload.user_id, is_bot: false },
      };
    }
    if (method.startsWith("send") || method.startsWith("edit")) {
      messageId += 1;
      return {
        chat: { id: payload.chat_id, type: "private" },
        date: 0,
        message_id: messageId,
        text: payload.text,
      };
    }
    return true;
  };

  const from = (id: number) => ({
    first_name: "Noor",
    id,
    is_bot: false,
    language_code: "en",
  });
  let updateId = 1;
  const message = (
    text: string,
    options: { chat?: number; thread?: number; user?: number } = {}
  ): Update => {
    const user = options.user ?? tgUser;
    const chat = options.chat ?? user;
    updateId += 1;
    const isCommand = text.startsWith("/");
    return {
      message: {
        chat:
          chat < 0
            ? { id: chat, is_forum: true, title: "SAL", type: "supergroup" }
            : { first_name: "Noor", id: chat, type: "private" },
        date: Math.floor(Date.now() / 1000),
        entities: isCommand
          ? [
              {
                length: text.split(" ")[0]?.length ?? 0,
                offset: 0,
                type: "bot_command",
              },
            ]
          : undefined,
        from: from(user),
        is_topic_message: options.thread ? true : undefined,
        message_id: updateId,
        message_thread_id: options.thread,
        text,
      },
      update_id: updateId,
    } as Update;
  };
  const press = (data: string, user = tgUser): Update => {
    updateId += 1;
    return {
      callback_query: {
        chat_instance: "1",
        data,
        from: from(user),
        id: String(updateId),
        message: {
          chat: { first_name: "Noor", id: user, type: "private" },
          date: 0,
          message_id: 1,
          text: "…",
        },
      },
      update_id: updateId,
    } as Update;
  };
  const sent = (method = "sendMessage") =>
    calls.filter((call) => call.method === method);
  const lastText = () => String(sent().at(-1)?.payload.text ?? "");

  beforeAll(async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = url;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = publishableKey;
    process.env.SUPABASE_SECRET_KEY = secretKey;
    bot = await loadBot();
    ({ runFeeds } = (await import("@/feeds")) as never);
    bot.api.config.use(((
      _prev: unknown,
      method: string,
      payload: Record<string, unknown>
    ) => {
      calls.push({ method, payload });
      return Promise.resolve({ ok: true, result: fake(method, payload) });
    }) as never);

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password,
      user_metadata: { full_name_en: "Noor Integration" },
    });
    expect(error).toBeNull();
    userId = created.user?.id ?? "";
    await admin
      .schema("membership")
      .from("memberships")
      .insert({ user_id: userId });
    const { data: event } = await admin
      .schema("events")
      .from("events")
      .insert({
        capacity: 5,
        members_only: false,
        slug: `tg-${stamp}`,
        starts_at: new Date(Date.now() + 2 * 86_400_000).toISOString(),
        status: "published",
        title_ar: "أمسية",
        title_en: `Telegram Evening ${stamp}`,
      })
      .select("id")
      .single();
    eventId = event?.id ?? "";
  });

  afterAll(async () => {
    if (!enabled) {
      return;
    }
    await admin
      .schema("core")
      .from("telegram_groups")
      .delete()
      .eq("chat_id", chatId);
    await admin
      .schema("core")
      .from("telegram_word_plays")
      .delete()
      .eq("telegram_id", tgUser);
    await admin.schema("events").from("events").delete().eq("id", eventId);
    await admin.auth.admin.deleteUser(userId);
  });

  test("links an account with the code from the Nexus", async () => {
    const member = createClient<Database>(url, publishableKey, {
      auth: { persistSession: false },
    });
    await member.auth.signInWithPassword({ email, password });
    const { data: code } = await member
      .schema("core")
      .rpc("telegram_link_code");
    await bot.handleUpdate(message(`/start link_${code}`));
    expect(lastText()).toContain("Linked");
    const { data: link } = await admin
      .schema("core")
      .from("telegram_accounts")
      .select("user_id")
      .eq("telegram_id", tgUser)
      .single();
    expect(link?.user_id).toBe(userId);

    await bot.handleUpdate(message(`/start link_${code}`));
    expect(lastText()).toContain("expired or was already used");
  });

  test("lists events and RSVPs as the member", async () => {
    await bot.handleUpdate(message("/events"));
    expect(lastText()).toContain(`Telegram Evening ${stamp}`);

    await bot.handleUpdate(press(`rsvp:${eventId}`));
    expect(String(sent("answerCallbackQuery").at(-1)?.payload.text)).toContain(
      "You're in"
    );
    const { data: rsvp } = await admin
      .schema("events")
      .from("rsvps")
      .select("status")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .single();
    expect(rsvp?.status).toBe("confirmed");
    expect(String(sent("editMessageText").at(-1)?.payload.text)).toContain(
      "You have a place."
    );

    await bot.handleUpdate(press(`rsvp:${eventId}`, stranger));
    expect(lastText()).toContain("Link your Nexus account first");
  });

  test("plays the daily word", async () => {
    await bot.handleUpdate(message("/word"));
    expect(lastText()).toContain("Word No.");
    await bot.handleUpdate(message("hi"));
    expect(lastText()).toContain("five-letter word");
    await bot.handleUpdate(message("ZZZZZ"));
    expect(lastText()).toContain("Z Z Z Z Z");
    expect(lastText()).toContain("5 tries left");
  });

  test("connects a group, sets a topic and posts there once", async () => {
    const code = "c".repeat(32);
    await admin
      .schema("core")
      .from("telegram_codes")
      .insert({
        code_hash: createHash("sha256").update(code).digest("hex"),
        purpose: "group",
        user_id: userId,
      });
    await bot.handleUpdate(message(`/setup ${code}`, { chat: chatId }));
    expect(lastText()).toContain("Connected");
    expect(sent("deleteMessage").length).toBeGreaterThan(0);

    await bot.handleUpdate(
      message("/topic events", { chat: chatId, thread: 5 })
    );
    expect(lastText()).toContain("now for events");

    const before = sent().length;
    await runFeeds(bot.api, "sal_test_bot");
    const posts = sent()
      .slice(before)
      .filter((call) => call.payload.chat_id === chatId);
    expect(
      posts.some((call) =>
        String(call.payload.text).includes(`Telegram Evening ${stamp}`)
      )
    ).toBe(true);
    expect(posts.every((call) => call.payload.message_thread_id === 5)).toBe(
      true
    );

    const again = sent().length;
    await runFeeds(bot.api, "sal_test_bot");
    expect(
      sent()
        .slice(again)
        .filter((call) =>
          String(call.payload.text).includes(`Telegram Evening ${stamp}`)
        )
    ).toHaveLength(0);
  });

  test("asks a stranger to tap before joining, then lets them in", async () => {
    updateId += 1;
    await bot.handleUpdate({
      chat_join_request: {
        chat: { id: chatId, title: "SAL", type: "supergroup" },
        date: 0,
        from: from(stranger),
        user_chat_id: stranger,
      },
      update_id: updateId,
    } as Update);
    const ask = sent().at(-1);
    expect(ask?.payload.chat_id).toBe(stranger);
    expect(JSON.stringify(ask?.payload.reply_markup)).toContain(
      `verify:${chatId}`
    );

    await bot.handleUpdate(press(`verify:${chatId}`, stranger));
    expect(sent("approveChatJoinRequest").at(-1)?.payload.user_id).toBe(
      stranger
    );
  });
});
