import { escapeHtml, link } from "@repo/telegram";
import { Composer, GrammyError } from "grammy";
import type { ChatPermissions, MessageEntity, User } from "grammy/types";
import type { BotContext } from "../../context";
import { copy, type Lang } from "../../copy";
import { db, type Group, setting, whoami } from "../../db";
import { displayName, formatDuration, parseDuration } from "../../format";
import { documentPage, messageLink } from "../../links";
import {
  canRestrict,
  currentGroup,
  groupLang,
  isStaff,
  postTo,
  replyHere,
  senderMember,
} from "./common";

/**
 * Keeping the group pleasant: warnings (three mute for a day), mutes, bans,
 * reports to the moderators' log topic, the rules, and one quiet rule for
 * newcomers: a link from someone who joined less than a day ago and isn't
 * a linked member is removed (and noted in the log). Moderation needs a
 * Telegram admin who may restrict members.
 */
export const moderation = new Composer<BotContext>();
const groups = moderation.chatType(["group", "supergroup"]);

const MAX_WARNINGS = 3;
const DAY = 24 * 60 * 60;
const SILENT: ChatPermissions = {
  can_add_web_page_previews: false,
  can_send_audios: false,
  can_send_documents: false,
  can_send_messages: false,
  can_send_other_messages: false,
  can_send_photos: false,
  can_send_polls: false,
  can_send_video_notes: false,
  can_send_videos: false,
  can_send_voice_notes: false,
};
const OPEN: ChatPermissions = Object.fromEntries(
  Object.keys(SILENT).map((key) => [key, true])
);

const until = (seconds: number) => Math.floor(Date.now() / 1000) + seconds;

/** The rules: the Acceptable Use Policy (with its status) and house rules. */
export const showRules = async (ctx: BotContext, lang: Lang) => {
  const t = copy[lang];
  const [house, doc] = await Promise.all([
    setting(lang === "ar" ? "telegram.rules_ar" : "telegram.rules_en"),
    db()
      .schema("governance")
      .from("society_documents")
      .select("status")
      .eq("slug", "acceptable-use")
      .maybeSingle(),
  ]);
  const policy = link(documentPage(lang, "acceptable-use"), t.policyName);
  const lines = [
    t.rulesIntro,
    "",
    t.rulesPolicy(policy, doc.data?.status !== "adopted"),
  ];
  if (typeof house === "string" && house.trim()) {
    lines.push("", escapeHtml(house.trim()));
  }
  await replyHere(ctx, lines.join("\n"));
};

groups.command("rules", async (ctx) => {
  const group = await currentGroup(ctx);
  await showRules(ctx, groupLang(group, ctx.lang));
});

interface Target {
  group: Group;
  lang: Lang;
  user: User;
}

/** A moderator's command about the person they replied to. */
const modCommand = (
  name: string,
  act: (
    ctx: BotContext & { chat: { id: number } },
    target: Target,
    arg: string
  ) => Promise<string>
) =>
  groups.command(name, async (ctx) => {
    const [member, group] = await Promise.all([
      senderMember(ctx),
      currentGroup(ctx),
    ]);
    if (!group) {
      await replyHere(ctx, ctx.t.notConnected);
      return;
    }
    const lang = groupLang(group, ctx.lang);
    const t = copy[lang];
    if (!(member && canRestrict(member))) {
      await replyHere(ctx, t.notAdmin);
      return;
    }
    const user = ctx.msg.reply_to_message?.from;
    // Replying to the topic itself (not a message) points at the topic's
    // creation, which says nothing about a person.
    if (!user || user.is_bot || ctx.msg.reply_to_message?.forum_topic_created) {
      await replyHere(ctx, t.needReply);
      return;
    }
    const targetMember = await ctx.getChatMember(user.id);
    if (isStaff(targetMember)) {
      await replyHere(ctx, t.notAdmins);
      return;
    }
    try {
      const said = await act(ctx, { group, lang, user }, ctx.match.trim());
      await replyHere(ctx, said);
      if (ctx.from) {
        await postTo(
          ctx.api,
          group,
          ["log"],
          t.modLog(displayName(ctx.from), said)
        );
      }
    } catch (error) {
      if (
        error instanceof GrammyError &&
        [400, 403].includes(error.error_code)
      ) {
        await replyHere(ctx, t.needRights);
        return;
      }
      throw error;
    }
  });

const memberRow = (target: Target) =>
  db()
    .schema("core")
    .from("telegram_members")
    .select("warnings")
    .eq("chat_id", target.group.chat_id)
    .eq("telegram_id", target.user.id)
    .maybeSingle();

const setWarnings = (target: Target, warnings: number) =>
  db().schema("core").from("telegram_members").upsert(
    {
      chat_id: target.group.chat_id,
      telegram_id: target.user.id,
      warnings,
    },
    { onConflict: "chat_id,telegram_id" }
  );

modCommand("warn", async (ctx, target) => {
  const t = copy[target.lang];
  const { data } = await memberRow(target);
  const warnings = (data?.warnings ?? 0) + 1;
  const name = displayName(target.user);
  if (warnings >= MAX_WARNINGS) {
    await ctx.restrictChatMember(target.user.id, SILENT, {
      until_date: until(DAY),
      use_independent_chat_permissions: true,
    });
    await setWarnings(target, 0);
    return t.warnMuted(name);
  }
  await setWarnings(target, warnings);
  return t.warned(name, String(warnings));
});

modCommand("unwarn", async (_ctx, target) => {
  await setWarnings(target, 0);
  return copy[target.lang].unwarned(displayName(target.user));
});

modCommand("mute", async (ctx, target, arg) => {
  const seconds = parseDuration(arg);
  await ctx.restrictChatMember(target.user.id, SILENT, {
    until_date: until(seconds),
    use_independent_chat_permissions: true,
  });
  return copy[target.lang].muted(
    displayName(target.user),
    formatDuration(target.lang, seconds)
  );
});

modCommand("unmute", async (ctx, target) => {
  await ctx.restrictChatMember(target.user.id, OPEN, {
    use_independent_chat_permissions: true,
  });
  return copy[target.lang].unmuted(displayName(target.user));
});

modCommand("ban", async (ctx, target) => {
  await ctx.banChatMember(target.user.id);
  const reported = ctx.msg?.reply_to_message;
  if (reported) {
    await ctx.api
      .deleteMessage(ctx.chat.id, reported.message_id)
      .catch(() => undefined);
  }
  return copy[target.lang].banned(displayName(target.user));
});

modCommand("unban", async (ctx, target) => {
  await ctx.unbanChatMember(target.user.id, { only_if_banned: true });
  return copy[target.lang].unbanned(displayName(target.user));
});

groups.command("report", async (ctx) => {
  const group = await currentGroup(ctx);
  const reported = ctx.msg.reply_to_message;
  if (!group) {
    return;
  }
  const t = copy[groupLang(group, ctx.lang)];
  if (!reported?.from || reported.forum_topic_created) {
    await replyHere(ctx, t.needReply);
    return;
  }
  const where = link(
    messageLink(
      group.chat_id,
      reported.message_id,
      reported.is_topic_message ? reported.message_thread_id : undefined
    ),
    t.reportLinkLabel
  );
  await postTo(
    ctx.api,
    group,
    ["log"],
    t.reportLog(displayName(ctx.from), displayName(reported.from), where)
  );
  await ctx.deleteMessage().catch(() => undefined);
  await replyHere(ctx, t.reported);
});

// ── Newcomers' links ────────────────────────────────────────────────────────

const LINKY = new Set<MessageEntity["type"]>(["url", "text_link", "mention"]);
const hasLink = (entities: MessageEntity[] | undefined) =>
  entities?.some((entity) => LINKY.has(entity.type)) ?? false;

groups.on("message", async (ctx, next) => {
  const { msg } = ctx;
  const linked =
    hasLink(msg.entities) ||
    hasLink(msg.caption_entities) ||
    Boolean(msg.forward_origin);
  if (!(linked && ctx.from) || msg.sender_chat) {
    return next();
  }
  const { data: row } = await db()
    .schema("core")
    .from("telegram_members")
    .select("joined_at")
    .eq("chat_id", ctx.chat.id)
    .eq("telegram_id", ctx.from.id)
    .maybeSingle();
  // People who were here before the bot, or joined over a day ago.
  if (!row || Date.now() - Date.parse(row.joined_at) > DAY * 1000) {
    return next();
  }
  const [me, member] = await Promise.all([
    whoami(ctx.from.id),
    ctx.getChatMember(ctx.from.id),
  ]);
  if (me?.member || isStaff(member)) {
    return next();
  }
  const group = await currentGroup(ctx);
  if (!group) {
    return next();
  }
  await ctx.deleteMessage().catch(() => undefined);
  const t = copy[groupLang(group, "en")];
  await postTo(ctx.api, group, ["log"], t.removedLink(displayName(ctx.from)));
});
