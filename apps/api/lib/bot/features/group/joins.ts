import type { Api } from "grammy";
import { Composer, GrammyError, InlineKeyboard } from "grammy";
import type { BotContext } from "../../context";
import { copy, langOf } from "../../copy";
import { db, group as loadGroup, whoami } from "../../db";
import { displayName, label } from "../../format";
import { botLink, connectPage } from "../../links";
import { groupText, postTo } from "./common";

/**
 * Joining a connected group. With "Approve new members" on, every request
 * comes to the bot: linked members get in at once; under "verify" everyone
 * else taps a button in a private message first (most spam bots never do);
 * under "members" they link their Nexus account first, and are let in the
 * moment they do. Everyone who joins is welcomed in the welcome topic, and
 * the "joined" and "left" service messages are cleared away.
 */
export const joins = new Composer<BotContext>();

const members = () => db().schema("core").from("telegram_members");

const approve = async (api: Api, chatId: number, telegramId: number) => {
  try {
    await api.approveChatJoinRequest(chatId, telegramId);
  } catch (error) {
    // Already handled, or the person withdrew the request.
    if (error instanceof GrammyError && error.error_code === 400) {
      return false;
    }
    throw error;
  }
  await members()
    .update({ verified_at: new Date().toISOString() })
    .eq("chat_id", chatId)
    .eq("telegram_id", telegramId);
  return true;
};

joins.on("chat_join_request", async (ctx) => {
  const request = ctx.chatJoinRequest;
  const group = await loadGroup(request.chat.id);
  if (!group) {
    return;
  }
  const person = request.from;
  await members().upsert(
    {
      chat_id: group.chat_id,
      joined_at: new Date().toISOString(),
      telegram_id: person.id,
      verified_at: null,
    },
    { onConflict: "chat_id,telegram_id" }
  );
  if (group.join_policy === "open") {
    await approve(ctx.api, group.chat_id, person.id);
    return;
  }
  const me = await whoami(person.id);
  if (me?.member || (me && group.join_policy === "verify")) {
    await approve(ctx.api, group.chat_id, person.id);
    return;
  }
  const lang = me?.locale ?? langOf(person.language_code);
  const t = copy[lang];
  const title = displayName({ first_name: request.chat.title ?? "SAL" });
  const keyboard = new InlineKeyboard();
  if (group.join_policy === "verify") {
    keyboard.text(t.buttons.verify, `verify:${group.chat_id}`).row();
  }
  keyboard.url(t.buttons.link, connectPage(lang));
  const text =
    group.join_policy === "verify"
      ? t.verifyAsk(displayName(person), title)
      : t.membersOnlyAsk(title);
  // Bots may write to someone who asked to join, even before /start.
  await ctx.api
    .sendMessage(request.user_chat_id, text, { reply_markup: keyboard })
    .catch(() => undefined);
});

joins.callbackQuery(/^verify:(-\d+)$/, async (ctx) => {
  const chatId = Number(ctx.match[1]);
  const group = await loadGroup(chatId);
  const t = copy[langOf(ctx.from.language_code)];
  const ok =
    group?.join_policy === "verify" &&
    (await approve(ctx.api, chatId, ctx.from.id));
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(ok ? t.verifyDone : t.verifyGone);
});

/**
 * After someone links their account: approve their waiting requests to
 * connected groups (members-only groups need a verified member).
 */
export const admitPending = async (api: Api, telegramId: number) => {
  const { data: waiting } = await members()
    .select("chat_id")
    .eq("telegram_id", telegramId)
    .is("verified_at", null);
  if (!waiting?.length) {
    return;
  }
  const me = await whoami(telegramId);
  await Promise.all(
    waiting.map(async ({ chat_id }) => {
      const group = await loadGroup(chat_id);
      if (group && (group.join_policy !== "members" || me?.member)) {
        await approve(api, chat_id, telegramId);
      }
    })
  );
};

const IN = new Set(["member", "administrator", "creator"]);
const OUT = new Set(["left", "kicked"]);

joins.on("chat_member", async (ctx) => {
  const update = ctx.chatMember;
  const before = update.old_chat_member;
  const after = update.new_chat_member;
  const joined =
    (IN.has(after.status) ||
      (after.status === "restricted" && after.is_member)) &&
    (OUT.has(before.status) ||
      (before.status === "restricted" && !before.is_member));
  const left = OUT.has(after.status);
  if (!(joined || left) || after.user.is_bot) {
    return;
  }
  const group = await loadGroup(update.chat.id);
  if (!group) {
    return;
  }
  if (left) {
    await members()
      .delete()
      .eq("chat_id", group.chat_id)
      .eq("telegram_id", after.user.id);
    return;
  }
  await members().upsert(
    { chat_id: group.chat_id, telegram_id: after.user.id },
    { ignoreDuplicates: true, onConflict: "chat_id,telegram_id" }
  );
  const name = displayName(after.user);
  await postTo(
    ctx.api,
    group,
    ["welcome"],
    groupText(group, (t) => t.welcome(name)),
    {
      reply_markup: new InlineKeyboard()
        .url(
          label(group.lang, (t) => t.buttons.rules),
          botLink(ctx.botUsername, "rules")
        )
        .url(
          label(group.lang, (t) => t.buttons.link),
          connectPage(group.lang === "ar" ? "ar" : "en")
        ),
    }
  );
});

// "X joined the group" / "X left": noise once the bot welcomes people.
joins.on(
  ["message:new_chat_members", "message:left_chat_member"],
  async (ctx) => {
    if (await loadGroup(ctx.chat.id)) {
      await ctx.deleteMessage().catch(() => undefined);
    }
  }
);

// Added to a group that isn't connected yet: say how to connect it.
joins.on("my_chat_member", async (ctx) => {
  const update = ctx.myChatMember;
  const added =
    OUT.has(update.old_chat_member.status) &&
    IN.has(update.new_chat_member.status);
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
