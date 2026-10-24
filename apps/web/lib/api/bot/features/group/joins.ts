import type { Api } from "grammy";
import { Composer, GrammyError, InlineKeyboard } from "grammy";
import type { BotContext } from "../../context";
import { copy, langOf } from "../../copy";
import { db, group as loadGroup, whoami } from "../../db";
import { connectPage } from "../../links";

/**
 * Join requests to a connected group ("Approve new members" on the invite
 * link). With BotFather's Guard mode, Telegram asks the bot first: a linked
 * Nexus account is approved at once, and everyone else is queued for the
 * group's admins in Telegram's own request list, with a private note
 * inviting them to link (the moment they do, they're let in). Welcome
 * messages, anti-spam, restrictions and bans are Telegram's own (group
 * settings and admin tools), not the bot's.
 */
export const joins = new Composer<BotContext>();

// Requests waiting for an admin, so linking later can let the person in.
const waiting = () => db().schema("core").from("telegram_members");

const forget = (chatId: number, telegramId: number) =>
  waiting().delete().eq("chat_id", chatId).eq("telegram_id", telegramId);

const approve = async (api: Api, chatId: number, telegramId: number) => {
  try {
    await api.approveChatJoinRequest(chatId, telegramId);
  } catch (error) {
    // Already handled by an admin, or the person withdrew the request.
    if (!(error instanceof GrammyError && error.error_code === 400)) {
      throw error;
    }
  }
  await forget(chatId, telegramId);
};

joins.on("chat_join_request", async (ctx) => {
  const request = ctx.chatJoinRequest;
  const person = request.from;
  const [group, me] = await Promise.all([
    loadGroup(request.chat.id),
    whoami(person.id),
  ]);
  // Guard mode: Telegram waits up to 10 seconds for the bot's answer.
  const answer = (result: "approve" | "queue") =>
    request.query_id
      ? ctx.api.answerChatJoinRequestQuery(request.query_id, result)
      : null;
  if (!group) {
    await answer("queue");
    return;
  }
  if (me) {
    await (request.query_id
      ? answer("approve")
      : approve(ctx.api, group.chat_id, person.id));
    return;
  }
  await answer("queue");
  await waiting().upsert(
    { chat_id: group.chat_id, telegram_id: person.id, verified_at: null },
    { onConflict: "chat_id,telegram_id" }
  );
  const lang = langOf(person.language_code);
  const t = copy[lang];
  // Bots may write to someone who asked to join, even before /start.
  await ctx.api
    .sendMessage(
      request.user_chat_id,
      t.joinWaiting(request.chat.title ?? "SAL"),
      {
        reply_markup: new InlineKeyboard().url(
          t.buttons.link,
          connectPage(lang)
        ),
      }
    )
    .catch(() => undefined);
});

/** After someone links their account: approve their waiting requests. */
export const admitPending = async (api: Api, telegramId: number) => {
  const { data: rows } = await waiting()
    .select("chat_id")
    .eq("telegram_id", telegramId);
  await Promise.all(
    (rows ?? []).map(({ chat_id }) => approve(api, chat_id, telegramId))
  );
};

// Added to a group that isn't connected yet: say how to connect it.
joins.on("my_chat_member", async (ctx) => {
  const update = ctx.myChatMember;
  const added =
    ["left", "kicked"].includes(update.old_chat_member.status) &&
    ["member", "administrator"].includes(update.new_chat_member.status);
  if (
    !added ||
    update.chat.type === "private" ||
    update.chat.type === "channel"
  ) {
    return;
  }
  if (!(await loadGroup(update.chat.id))) {
    await ctx.api
      .sendMessage(update.chat.id, copy.en.notConnected)
      .catch(() => undefined);
  }
});
