import "server-only";

import type { AdminClient } from "@repo/database/admin";
import { Api, GrammyError } from "grammy";
import { env } from "@/env";
import { log } from "@/lib/observability/log";
import { noticeMessage } from "@/lib/telegram";
import { type Sticker, type StickerSet, stickerId } from "./bot/stickers";
import type { PushNotice } from "./push";

const OPEN = { ar: "افتح", en: "Open" } as const;

/**
 * Copies of the Diwan notices in Telegram, for members who linked it with
 * Hudhud (lib/bot) and left notices on, through grammY's client, the one
 * Hudhud uses (audit D5). Email stays the record: a failure
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
  // The platform's fetch (as the rest of the API routes use), not grammY's
  // Node shim.
  const api = new Api(token, { fetch: globalThis.fetch as never });
  try {
    await api.raw.sendMessage({
      chat_id: account.telegram_id,
      ...noticeMessage({
        body: notice.body,
        button: { text: OPEN[notice.lang], url: notice.url },
        title: notice.title,
      }),
    });
    const id = sticker
      ? await stickerId(
          sticker,
          (name) => api.raw.getStickerSet({ name }) as Promise<StickerSet>
        ).catch(() => null)
      : null;
    if (id) {
      await api.raw
        .sendSticker({ chat_id: account.telegram_id, sticker: id })
        .catch(() => undefined);
    }
    return true;
  } catch (error) {
    if (error instanceof GrammyError && error.error_code === 403) {
      await admin
        .schema("core")
        .from("telegram_accounts")
        .update({ notify: false })
        .eq("user_id", userId);
    } else {
      log.warn("Telegram notice failed", {
        code: error instanceof GrammyError ? error.error_code : 0,
      });
    }
    return false;
  }
};
