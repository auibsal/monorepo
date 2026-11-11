import { Composer } from "grammy";
import type { BotContext } from "../../context";
import { db } from "../../db";
import { isStaff, replyHere, senderMember } from "./common";

/**
 * Connecting a group: /setup takes the one-time code an officer made in the
 * Diwan (settings.manage) and is deleted from the chat at once. Everything
 * else about a group (its topics, language and audience) is set in the
 * Diwan, Media → Channels, never typed in the chat (decisions §6).
 */
export const setup = new Composer<BotContext>();
const groups = setup.chatType(["group", "supergroup"]);

const CODE = /^[0-9a-f]{32}$/u;

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
