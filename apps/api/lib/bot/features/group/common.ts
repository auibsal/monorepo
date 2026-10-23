import type { Api, RawApi } from "grammy";
import type { ChatMember } from "grammy/types";
import type { BotContext } from "../../context";
import { type Copy, copy, type Lang, type Purpose } from "../../copy";
import { type Group, group as loadGroup } from "../../db";
import { bilingual } from "../../format";

type Other = Parameters<Api<RawApi>["sendMessage"]>[2];

/** The group's text: one language, or English then Arabic. */
export const groupText = (
  group: Pick<Group, "lang">,
  build: (t: Copy, lang: Lang) => string
) => bilingual(group.lang, (lang) => build(copy[lang], lang));

/** The language for a reply in the group ("both" answers in English first). */
export const groupLang = (group: Pick<Group, "lang"> | null, fallback: Lang) =>
  group && group.lang !== "both" ? group.lang : fallback;

export const isStaff = (member: ChatMember) =>
  member.status === "creator" || member.status === "administrator";

/**
 * The sender's standing: anonymous admins post as the group itself, so a
 * message sent as the chat counts as an admin's.
 */
export const senderMember = (ctx: BotContext): Promise<ChatMember | null> => {
  if (ctx.msg?.sender_chat?.id === ctx.chat?.id) {
    return Promise.resolve({ status: "creator" } as ChatMember);
  }
  if (!ctx.from) {
    return Promise.resolve(null);
  }
  return ctx.getChatMember(ctx.from.id);
};

/** Replies in the same topic the command came from. */
export const replyHere = (ctx: BotContext, text: string, other: Other = {}) =>
  ctx.reply(text, {
    message_thread_id: ctx.msg?.is_topic_message
      ? ctx.msg.message_thread_id
      : undefined,
    ...other,
  });

/** The topic for a purpose: undefined when none is set, 0 for General. */
export const topicOf = (group: Group, ...wanted: Purpose[]) => {
  for (const purpose of wanted) {
    const thread = group.topics[purpose];
    if (typeof thread === "number") {
      return thread;
    }
  }
};

/** Posts to a purpose's topic; null when the group has no such topic. */
export const postTo = (
  api: Api,
  group: Group,
  purposes: Purpose[],
  text: string,
  other: Other = {}
) => {
  const thread = topicOf(group, ...purposes);
  if (thread === undefined) {
    return Promise.resolve(null);
  }
  return api.sendMessage(group.chat_id, text, {
    message_thread_id: thread || undefined,
    ...other,
  });
};

/** The connected group of this update, or null. */
export const currentGroup = (ctx: BotContext) =>
  ctx.chat && ctx.chat.type !== "private" ? loadGroup(ctx.chat.id) : null;
