import type { Api } from "grammy";
import type { BotCommand } from "grammy/types";
import { allowedUpdates } from "./bot";
import { type Copy, copy, type Lang } from "./copy";
import { telegramSignal } from "./membership";

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
  "qirtas",
  "word",
  "me",
  "help",
];
const GROUP: (keyof Copy["commands"])[] = ["events", "help"];
const ADMINS: (keyof Copy["commands"])[] = [...GROUP, "setup"];

/**
 * Each call runs side by side with its own timeout; the result names the
 * steps that failed (the webhook, a language's commands or texts) instead
 * of one call holding the rest.
 */
export const configure = async (
  api: Api,
  {
    secretToken,
    timeoutMs,
    url,
  }: { secretToken?: string; timeoutMs: number; url: string }
) => {
  const signal = () => telegramSignal(timeoutMs);
  // English is the default; Arabic for Telegram apps set to Arabic.
  const langs: (Lang | undefined)[] = [undefined, "ar"];
  const steps: [string, () => Promise<unknown>][] = [
    [
      "webhook",
      () =>
        api.setWebhook(
          url,
          {
            allowed_updates: [...allowedUpdates],
            max_connections: 40,
            secret_token: secretToken,
          },
          signal()
        ),
    ],
    ...langs.flatMap((lang): [string, () => Promise<unknown>][] => {
      const t = copy[lang ?? "en"];
      const language_code = lang;
      const tag = lang ?? "en";
      return [
        [
          `commands.private.${tag}`,
          () =>
            api.setMyCommands(
              list(t, PRIVATE),
              { language_code, scope: { type: "all_private_chats" } },
              signal()
            ),
        ],
        [
          `commands.groups.${tag}`,
          () =>
            api.setMyCommands(
              list(t, GROUP),
              { language_code, scope: { type: "all_group_chats" } },
              signal()
            ),
        ],
        [
          `commands.admins.${tag}`,
          () =>
            api.setMyCommands(
              list(t, ADMINS),
              { language_code, scope: { type: "all_chat_administrators" } },
              signal()
            ),
        ],
        [
          `description.${tag}`,
          () =>
            api.setMyDescription(t.description, { language_code }, signal()),
        ],
        [
          `shortDescription.${tag}`,
          () =>
            api.setMyShortDescription(
              t.shortDescription,
              { language_code },
              signal()
            ),
        ],
      ];
    }),
  ];
  const results = await Promise.allSettled(steps.map(([, run]) => run()));
  const failed = steps
    .filter((_, i) => results[i]?.status === "rejected")
    .map(([name]) => name);
  const info = await api.getWebhookInfo(signal()).catch(() => null);
  return { failed, info };
};
