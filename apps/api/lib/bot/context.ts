import type { Context } from "grammy";
import { type Copy, copy, type Lang, langOf } from "./copy";
import { type Account, whoami } from "./db";

export interface Flavor {
  /** The linked Nexus account, loaded once per update when first asked for. */
  account: () => Promise<Account | null>;
  /** The bot's username, for start links. */
  botUsername: string;
  lang: Lang;
  t: Copy;
}

export type BotContext = Context & Flavor;

/**
 * Language: the linked account's choice in the Nexus, otherwise the
 * language of the person's Telegram app. Nothing is looked up until a
 * handler asks for the account, so most updates cost no database call.
 */
export const flavor = async (ctx: BotContext, next: () => Promise<void>) => {
  const lang = langOf(ctx.from?.language_code);
  ctx.lang = lang;
  ctx.t = copy[lang];
  ctx.botUsername = ctx.me.username;
  let loaded: Promise<Account | null> | undefined;
  ctx.account = () => {
    loaded ??= ctx.from
      ? whoami(ctx.from.id).then((account) => {
          if (account) {
            ctx.lang = account.locale;
            ctx.t = copy[account.locale];
          }
          return account;
        })
      : Promise.resolve(null);
    return loaded;
  };
  await next();
};
