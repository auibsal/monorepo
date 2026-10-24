import { escapeHtml } from "@repo/telegram";
import { type Api, Composer, InlineKeyboard } from "grammy";
import type { BotContext } from "../context";
import { type Copy, copy, type Lang } from "../copy";
import { db, visibleEvents, whoami } from "../db";
import { pick, when } from "../format";
import { accountPage, connectPage, wordPage } from "../links";
import { admitPending } from "./group/joins";

/**
 * Linking a Telegram account to the Nexus, and the member's own corner:
 * /start link_<code> from the Nexus, /me, notices on or off, unlinking.
 */
export const account = new Composer<BotContext>();
const dm = account.chatType("private");

const LINK = /^link_([0-9a-f]{32})$/;

export const linkKeyboard = (ctx: BotContext) =>
  new InlineKeyboard().url(ctx.t.buttons.link, connectPage(ctx.lang));

export const accountName = (
  ctx: BotContext,
  nameEn: string,
  nameAr: string | null
) => escapeHtml(pick(ctx.lang, nameEn, nameAr) || ctx.from?.first_name || "");

/** /start link_<code>: redeem the one-time code the Nexus made. */
export const redeemLink = async (ctx: BotContext, payload: string) => {
  const code = LINK.exec(payload)?.[1];
  if (!(code && ctx.from)) {
    return false;
  }
  const { data: userId } = await db()
    .schema("core")
    .rpc("telegram_redeem_link", {
      code,
      telegram_id: ctx.from.id,
      username: ctx.from.username,
    });
  if (!userId) {
    await ctx.reply(ctx.t.linkFailed, { reply_markup: linkKeyboard(ctx) });
    return true;
  }
  const me = await ctx.account();
  await ctx.reply(
    ctx.t.linked(accountName(ctx, me?.name_en ?? "", me?.name_ar ?? null)),
    {
      reply_markup: menu(ctx),
    }
  );
  // Waiting at a group's door because they weren't linked? Let them in.
  await admitPending(ctx.api, ctx.from.id);
  return true;
};

const menuFor = (t: Copy, lang: Lang) =>
  new InlineKeyboard()
    .text(t.buttons.events, "evs")
    .text(t.buttons.waraq, "waraq")
    .row()
    .webApp(t.buttons.word, wordPage(lang))
    .text(t.buttons.me, "me")
    .row()
    .url(t.buttons.nexus, accountPage(lang));

export const menu = (ctx: BotContext) => menuFor(ctx.t, ctx.lang);

/**
 * After a member links Telegram from the Nexus (Telegram's login): the same
 * greeting as a redeemed code, and anyone waiting at a group's door is let
 * in. The login's bot_access scope lets the bot write first.
 */
export const greetLinked = async (api: Api, telegramId: number) => {
  const me = await whoami(telegramId);
  if (!me) {
    return;
  }
  const t = copy[me.locale];
  const name = escapeHtml(pick(me.locale, me.name_en, me.name_ar));
  await api
    .sendMessage(telegramId, t.linked(name), {
      reply_markup: menuFor(t, me.locale),
    })
    .catch(() => undefined);
  await admitPending(api, telegramId);
};

const meView = async (ctx: BotContext) => {
  const me = await ctx.account();
  if (!(me && ctx.from)) {
    return {
      keyboard: linkKeyboard(ctx),
      text: `${ctx.t.notLinked}\n\n${ctx.t.linkHow}`,
    };
  }
  const places = (await visibleEvents(ctx.from.id, { max: 20 })).filter(
    (event) => event.mine
  );
  const lines = [
    ctx.t.meTitle(accountName(ctx, me.name_en, me.name_ar)),
    me.member ? ctx.t.memberYes : ctx.t.memberNo,
    "",
    ctx.t.myPlaces,
    ...(places.length
      ? places.map(
          (event) =>
            `${escapeHtml(pick(ctx.lang, event.title_en, event.title_ar))}\n${when(ctx.lang, event.starts_at)}${event.mine === "waitlisted" ? ` · ${ctx.t.waitlisted}` : ""}`
        )
      : [ctx.t.noPlaces]),
  ];
  const keyboard = new InlineKeyboard()
    .text(
      me.notify ? ctx.t.buttons.notifyOn : ctx.t.buttons.notifyOff,
      me.notify ? "notify:off" : "notify:on"
    )
    .row()
    .url(ctx.t.buttons.nexus, accountPage(ctx.lang))
    .text(ctx.t.buttons.unlink, "unlink");
  return { keyboard, text: lines.join("\n") };
};

dm.command("me", async (ctx) => {
  const view = await meView(ctx);
  await ctx.reply(view.text, { reply_markup: view.keyboard });
});

dm.callbackQuery("me", async (ctx) => {
  const view = await meView(ctx);
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(view.text, { reply_markup: view.keyboard });
});

dm.command("link", async (ctx) => {
  const me = await ctx.account();
  await ctx.reply(
    me
      ? ctx.t.alreadyLinked(accountName(ctx, me.name_en, me.name_ar))
      : ctx.t.linkHow,
    { reply_markup: me ? menu(ctx) : linkKeyboard(ctx) }
  );
});

dm.callbackQuery(/^notify:(on|off)$/, async (ctx) => {
  const on = ctx.match[1] === "on";
  await db()
    .schema("core")
    .from("telegram_accounts")
    .update({ notify: on })
    .eq("telegram_id", ctx.from.id);
  await ctx.answerCallbackQuery(on ? ctx.t.notifyOn : ctx.t.notifyOff);
  const view = await meView(ctx);
  await ctx.editMessageText(view.text, { reply_markup: view.keyboard });
});

dm.callbackQuery("unlink", async (ctx) => {
  await ctx.account();
  await db()
    .schema("core")
    .from("telegram_accounts")
    .delete()
    .eq("telegram_id", ctx.from.id);
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(ctx.t.unlinked, {
    reply_markup: linkKeyboard(ctx),
  });
});
