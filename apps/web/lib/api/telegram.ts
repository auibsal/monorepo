import "server-only";

import type { AdminClient } from "@repo/database/admin";
import { log } from "@repo/observability/log";
import { callTelegram, noticeMessage, TelegramError } from "@repo/telegram";
import { env } from "@/env";
import { type Sticker, stickerId } from "./bot/stickers";
import type { PushNotice } from "./push";

const OPEN = { ar: "افتح", en: "Open" } as const;

/**
 * Copies of the Nexus notices in Telegram, for members who linked it with
 * Hudhud (lib/bot) and left notices on. Email stays the record: a failure
 * is logged and never fails the outbox row. A member who blocked the bot
 * (403) has their Telegram notices turned off.
 */
export const telegramToUser = async (
  admin: AdminClient,
  userId: string,
  notice: PushNotice,
  /** Hudhud after the notice, never instead of it (bot/stickers.ts). */
  sticker?: Sticker
) => {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return false;
  }
  const { data: account } = await admin
    .schema("core")
    .from("telegram_accounts")
    .select("telegram_id, notify")
    .eq("user_id", userId)
    .maybeSingle();
  if (!account?.notify) {
    return false;
  }
  try {
    await callTelegram(token, "sendMessage", {
      chat_id: account.telegram_id,
      ...noticeMessage({
        body: notice.body,
        button: { text: OPEN[notice.lang], url: notice.url },
        title: notice.title,
      }),
    });
    const id = sticker ? stickerId(sticker) : null;
    if (id) {
      await callTelegram(token, "sendSticker", {
        chat_id: account.telegram_id,
        sticker: id,
      }).catch(() => undefined);
    }
    return true;
  } catch (error) {
    if (error instanceof TelegramError && error.code === 403) {
      await admin
        .schema("core")
        .from("telegram_accounts")
        .update({ notify: false })
        .eq("user_id", userId);
    } else {
      log.warn("Telegram notice failed", {
        code: error instanceof TelegramError ? error.code : 0,
      });
    }
    return false;
  }
};
