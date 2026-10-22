import { autoRetry } from "@grammyjs/auto-retry";
import { botIdFromToken } from "@repo/telegram";
import { Bot, GrammyError, HttpError } from "grammy";
import type { UserFromGetMe } from "grammy/types";
import { env } from "@/env";
import { type BotContext, flavor } from "./context";
import { account } from "./features/account";
import { events } from "./features/events";
import { joins } from "./features/group/joins";
import { moderation } from "./features/group/moderation";
import { setup } from "./features/group/setup";
import { inline } from "./features/inline";
import { start } from "./features/start";
import { waraq } from "./features/waraq";
import { word } from "./features/word";

// Methods whose text we write in Telegram HTML, with link previews off
// unless a post asks for one.
const FORMATTED = new Set([
  "sendMessage",
  "editMessageText",
  "sendPhoto",
  "editMessageCaption",
]);

/**
 * The bot's identity without a getMe call on every cold start: the id is
 * in the token and the username is configured. Telegram checks commands
 * addressed to "@username" against it.
 */
const identity = (token: string, username: string): UserFromGetMe => ({
  allows_users_to_create_topics: false,
  can_connect_to_business: false,
  can_join_groups: true,
  can_manage_bots: false,
  can_read_all_group_messages: false,
  first_name: "Hudhud",
  has_main_web_app: false,
  has_topics_enabled: false,
  id: botIdFromToken(token),
  is_bot: true,
  supports_inline_queries: true,
  supports_join_request_queries: false,
  username,
});

export const createBot = (
  token: string,
  username = env.TELEGRAM_BOT_USERNAME
) => {
  const bot = new Bot<BotContext>(token, {
    botInfo: username ? identity(token, username) : undefined,
    client: { timeoutSeconds: 15 },
  });

  // Flood limits: wait and retry briefly; never hold a webhook for long.
  bot.api.config.use(autoRetry({ maxDelaySeconds: 5, maxRetryAttempts: 2 }));
  bot.api.config.use((prev, method, payload, signal) =>
    FORMATTED.has(method)
      ? prev(
          method,
          {
            link_preview_options: { is_disabled: true },
            parse_mode: "HTML",
            ...payload,
          },
          signal
        )
      : prev(method, payload, signal)
  );

  bot.use(flavor);
  bot.use(start, account, events, waraq, word, inline);
  bot.use(setup, joins, moderation);

  bot.catch(async ({ ctx, error }) => {
    if (error instanceof GrammyError) {
      console.error(
        "Telegram refused a request",
        error.method,
        error.description
      );
    } else if (error instanceof HttpError) {
      console.error("Could not reach Telegram", error.message);
    } else {
      console.error("Update failed", ctx.update.update_id, error);
    }
    // Let the person know, where there is a person waiting.
    try {
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery(ctx.t?.generic);
      } else if (ctx.chat?.type === "private" && ctx.t) {
        await ctx.reply(ctx.t.generic);
      }
    } catch {
      // Nothing more to do: the error is logged above.
    }
  });

  return bot;
};

/** The updates the bot asks Telegram for (chat_member needs it said). */
export const allowedUpdates = [
  "message",
  "callback_query",
  "inline_query",
  "chat_join_request",
  "chat_member",
  "my_chat_member",
] as const;

let shared: Bot<BotContext> | undefined;

/** One bot per instance, created on the first update. */
export const sharedBot = () => {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set.");
  }
  shared ??= createBot(token);
  return shared;
};
