import type { Api } from "grammy";
import { Composer, GrammyError, InlineKeyboard } from "grammy";
import type { BotContext } from "../../context";
import { copy } from "../../copy";
import { db, isStaffAccount, group as loadGroup, whoami } from "../../db";
import { connectPage } from "../../links";
import { groupLang, isStaff, replyHere } from "./common";

/** A week between the warning and the removal (decisions.md). */
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const members = () => db().schema("core").from("telegram_members");

/**
 * Whether this person stays without an account (decisions §6): a linked
 * member, the group's admins, anyone holding a Society role, and the
 * exempt list Membership keeps in the Diwan (Student Life's staff, the
 * Faculty Advisor).
 */
const exempt = async (api: Api, chatId: number, telegramId: number) => {
  const me = await whoami(telegramId);
  if (me?.member) {
    return true;
  }
  const { data: listed } = await db()
    .schema("core")
    .from("telegram_exempt")
    .select("telegram_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  if (listed) {
    return true;
  }
  const standing = await api
    .getChatMember(chatId, telegramId)
    .catch(() => null);
  if (!standing || standing.status === "left" || standing.status === "kicked") {
    // Gone already: nothing to remove.
    return true;
  }
  return isStaff(standing) || (await isStaffAccount(telegramId));
};

/**
 * Hudhud's removals (decisions §6). Telegram doesn't let a bot list a
 * group's members, so the first time someone without a linked member's
 * account posts in the members' group, Hudhud tells them privately that
 * they'll be removed in a week unless they join on auibsal.org and link
 * their account. Only if Telegram won't let Hudhud write to them first
 * does the notice go in the topic instead. `runRemovals` removes them a
 * week later.
 */
export const removals = new Composer<BotContext>();

removals.on("message", async (ctx, next) => {
  await next();
  const { chat, from } = ctx;
  if (!from || from.is_bot || ctx.msg.sender_chat || chat.type === "private") {
    return;
  }
  const group = await loadGroup(chat.id);
  // The staff group lets in only role holders at the door (joins.ts).
  if (!group || group.audience === "staff") {
    return;
  }
  const { data: seen } = await members()
    .select("warned_at")
    .eq("chat_id", chat.id)
    .eq("telegram_id", from.id)
    .maybeSingle();
  if (seen?.warned_at || (await exempt(ctx.api, chat.id, from.id))) {
    return;
  }
  const { error } = await members().upsert(
    {
      chat_id: chat.id,
      removed_at: null,
      telegram_id: from.id,
      warned_at: new Date().toISOString(),
    },
    { onConflict: "chat_id,telegram_id" }
  );
  if (error) {
    throw new Error(error.message);
  }
  const lang = groupLang(group, from.language_code === "ar" ? "ar" : "en");
  const t = copy[lang];
  const markup = {
    reply_markup: new InlineKeyboard().url(t.buttons.link, connectPage(lang)),
  };
  const told = await ctx.api
    .sendMessage(from.id, t.removalWarning(from.first_name), markup)
    .then(() => true)
    .catch(() => false);
  if (!told) {
    await replyHere(ctx, t.removalWarning(from.first_name), markup).catch(
      () => undefined
    );
  }
});

/** Removes one warned person, unless they've since become exempt. */
const removeOne = async (api: Api, chatId: number, telegramId: number) => {
  if (await exempt(api, chatId, telegramId)) {
    await members()
      .delete()
      .eq("chat_id", chatId)
      .eq("telegram_id", telegramId);
    return false;
  }
  try {
    await api.banChatMember(chatId, telegramId);
    await api.unbanChatMember(chatId, telegramId, { only_if_banned: true });
  } catch (failure) {
    // Not an admin in that group any more: leave it to its admins.
    if (failure instanceof GrammyError) {
      return false;
    }
    throw failure;
  }
  await members()
    .update({ removed_at: new Date().toISOString() })
    .eq("chat_id", chatId)
    .eq("telegram_id", telegramId);
  return true;
};

/**
 * Every run of the Telegram cron: removes whoever was warned a week ago and
 * still hasn't linked a member's account. A removal is a ban lifted at once,
 * so they can come back through the invite link once they've joined.
 */
export const runRemovals = async (api: Api) => {
  const due = new Date(Date.now() - WEEK_MS).toISOString();
  const { data, error } = await members()
    .select("chat_id, telegram_id")
    .not("warned_at", "is", null)
    .is("removed_at", null)
    .lte("warned_at", due)
    .limit(50);
  if (error) {
    throw error;
  }
  const results = await Promise.all(
    (data ?? []).map((row) =>
      removeOne(api, Number(row.chat_id), Number(row.telegram_id))
    )
  );
  return results.filter(Boolean).length;
};
