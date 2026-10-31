import type { Api } from "grammy";
import type { BotCommand } from "grammy/types";
import { allowedUpdates } from "./bot";
import { type Copy, copy, type Lang } from "./copy";

/**
 * Tells Telegram about the bot: where to deliver updates, the commands in
 * each language and place, and the profile texts (BotFather sets them in
 * one language only). The menu button, Main App, pictures and the rest are
 * BotFather's. Safe to run again after every deploy (POST /telegram/setup).
 */

const list = (t: Copy, names: (keyof Copy["commands"])[]): BotCommand[] =>
  names.map((command) => ({ command, description: t.commands[command] }));

const PRIVATE: (keyof Copy["commands"])[] = [
  "start",
  "events",
  "waraq",
  "word",
  "me",
  "help",
];
const GROUP: (keyof Copy["commands"])[] = ["events", "help"];
const ADMINS: (keyof Copy["commands"])[] = [
  ...GROUP,
  "topic",
  "lang",
  "audience",
  "setup",
];

export const configure = async (
  api: Api,
  { secretToken, url }: { secretToken?: string; url: string }
) => {
  await api.setWebhook(url, {
    allowed_updates: [...allowedUpdates],
    max_connections: 40,
    secret_token: secretToken,
  });
  // English is the default; Arabic for Telegram apps set to Arabic.
  const langs: (Lang | undefined)[] = [undefined, "ar"];
  await Promise.all(
    langs.flatMap((lang) => {
      const t = copy[lang ?? "en"];
      const language_code = lang;
      return [
        api.setMyCommands(list(t, PRIVATE), {
          language_code,
          scope: { type: "all_private_chats" },
        }),
        api.setMyCommands(list(t, GROUP), {
          language_code,
          scope: { type: "all_group_chats" },
        }),
        api.setMyCommands(list(t, ADMINS), {
          language_code,
          scope: { type: "all_chat_administrators" },
        }),
        api.setMyDescription(t.description, { language_code }),
        api.setMyShortDescription(t.shortDescription, { language_code }),
      ];
    })
  );
  return api.getWebhookInfo();
};
