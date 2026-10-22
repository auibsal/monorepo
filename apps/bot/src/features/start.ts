import { Composer } from "grammy";
import type { BotContext } from "../context";
import { accountName, menu, redeemLink } from "./account";
import { EVENT_PAYLOAD, showEvent } from "./events";
import { showRules } from "./group/moderation";
import { startWord } from "./word";

/** /start (with the payloads other places link to) and /help. */
export const start = new Composer<BotContext>();
const dm = start.chatType("private");

dm.command("start", async (ctx) => {
  const payload = ctx.match.trim();
  if (payload.startsWith("link_") && (await redeemLink(ctx, payload))) {
    return;
  }
  const event = EVENT_PAYLOAD.exec(payload)?.[1];
  if (event) {
    await showEvent(ctx, event);
    return;
  }
  if (payload === "word") {
    await startWord(ctx);
    return;
  }
  if (payload === "rules") {
    await showRules(ctx, ctx.lang);
    return;
  }
  const me = await ctx.account();
  const name = me
    ? accountName(ctx, me.name_en, me.name_ar)
    : accountName(ctx, "", null);
  await ctx.reply(ctx.t.greeting(name || undefined), {
    reply_markup: menu(ctx),
  });
});

start.command("help", async (ctx) => {
  await ctx.account();
  await ctx.reply(ctx.t.help, {
    reply_markup: ctx.chat.type === "private" ? menu(ctx) : undefined,
  });
});
