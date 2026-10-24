import { Composer } from "grammy";
import type { BotContext } from "../../context";
import { copy, type Purpose, purposes } from "../../copy";
import { db } from "../../db";
import {
  currentGroup,
  groupLang,
  isStaff,
  replyHere,
  senderMember,
} from "./common";

/**
 * Connecting a group and telling the bot about it. /setup takes the code an
 * officer made in the Nexus (settings.manage); the rest is for the group's
 * Telegram admins: /topic, /lang.
 */
export const setup = new Composer<BotContext>();
const groups = setup.chatType(["group", "supergroup"]);

const CODE = /^[0-9a-f]{32}$/;

groups.command("setup", async (ctx) => {
  const member = await senderMember(ctx);
  if (!(member && isStaff(member))) {
    await replyHere(ctx, ctx.t.notAdmin);
    return;
  }
  const code = ctx.match.trim();
  // The code is spent either way; take it out of the chat.
  await ctx.deleteMessage().catch(() => undefined);
  if (!CODE.test(code)) {
    await replyHere(ctx, ctx.t.setupUsage);
    return;
  }
  const { data: ok } = await db()
    .schema("core")
    .rpc("telegram_register_group", {
      chat_id: ctx.chat.id,
      code,
      title: ctx.chat.title,
    });
  await replyHere(ctx, ok ? ctx.t.setupOk : ctx.t.setupBad);
});

/** Admin commands that need a connected group; the handler gets the group. */
const adminCommand = (
  name: string,
  handler: (
    ctx: BotContext & { chat: { id: number } },
    arg: string,
    group: NonNullable<Awaited<ReturnType<typeof currentGroup>>>
  ) => Promise<void>
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
    const t = copy[groupLang(group, ctx.lang)];
    if (!(member && isStaff(member))) {
      await replyHere(ctx, t.notAdmin);
      return;
    }
    ctx.t = t;
    await handler(ctx, ctx.match.trim().toLowerCase(), group);
  });

adminCommand("topic", async (ctx, arg, group) => {
  // General (or a group without topics) is thread 0.
  const thread = ctx.msg?.is_topic_message
    ? (ctx.msg.message_thread_id ?? 0)
    : 0;
  const topics = { ...group.topics };
  if (arg === "none") {
    for (const [purpose, id] of Object.entries(topics)) {
      if (id === thread) {
        delete topics[purpose];
      }
    }
  } else if (purposes.includes(arg as Purpose)) {
    topics[arg] = thread;
  } else {
    await replyHere(ctx, ctx.t.topicUsage);
    return;
  }
  await db()
    .schema("core")
    .from("telegram_groups")
    .update({ topics })
    .eq("chat_id", ctx.chat.id);
  await replyHere(
    ctx,
    arg === "none"
      ? ctx.t.topicCleared
      : ctx.t.topicOk(ctx.t.purposeNames[arg as Purpose])
  );
});

adminCommand("lang", async (ctx, arg) => {
  if (!(arg === "en" || arg === "ar" || arg === "both")) {
    await replyHere(ctx, ctx.t.langUsage);
    return;
  }
  await db()
    .schema("core")
    .from("telegram_groups")
    .update({ lang: arg })
    .eq("chat_id", ctx.chat.id);
  await replyHere(ctx, copy[arg === "both" ? ctx.lang : arg].langOk);
});
