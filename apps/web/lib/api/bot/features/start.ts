import { Composer, InlineKeyboard } from "grammy";
import type { BotContext } from "../context";
import { wordPage } from "../links";
import { accountName, menu, redeemLink } from "./account";
import { EVENT_PAYLOAD, showEvent } from "./events";

/** /start (with the payloads other places link to), /word and /help. */
export const start = new Composer<BotContext>();
const dm = start.chatType("private");

/**
 * The daily word is auibsal.org's own game, opened inside Telegram as a
 * Mini App; the bot only hands it over.
 */
const openWord = (ctx: BotContext) =>
  ctx.reply(ctx.t.wordOpen, {
    reply_markup: new InlineKeyboard().webApp(
      ctx.t.buttons.play,
      wordPage(ctx.lang)
    ),
  });

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
    await openWord(ctx);
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

dm.command("word", openWord);

start.command("help", async (ctx) => {
  await ctx.account();
  await ctx.reply(ctx.t.help, {
    reply_markup: ctx.chat.type === "private" ? menu(ctx) : undefined,
  });
});
