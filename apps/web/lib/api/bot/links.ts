import { apiUrl, nexusUrl, siteUrl } from "@repo/internationalization";
import { startLink } from "@repo/telegram";
import type { Lang } from "./copy";

/** A public page, in the member's language (English has no prefix). */
export const web = (lang: Lang, path = "") => siteUrl(lang, path || "/");

/** A Nexus page (auibsal.org/diwan), in the member's language. */
export const nexus = (lang: Lang, path = "") => nexusUrl(lang, path || "/");

export const eventPage = (lang: Lang, slug: string) =>
  web(lang, `/events/${slug}`);

export const piecePage = (lang: Lang, slug: string) =>
  web(lang, `/qirtas/pieces/${slug}`);

export const eventCalendar = (lang: Lang, slug: string) =>
  apiUrl(`/calendar/events/${slug}.ics${lang === "ar" ? "?lang=ar" : ""}`);

export const wordPage = (lang: Lang) => web(lang, "/qirtas/games/word");

export const documentPage = (lang: Lang, slug: string) =>
  web(lang, `/documents/${slug}`);

/** Where a member connects Telegram: their profile in the Nexus. */
export const connectPage = (lang: Lang) => nexus(lang, "/profile#telegram");

export const botLink = (username: string, payload?: string) =>
  startLink(username, payload);

/**
 * The bot's Main App (BotFather: Mini Apps, Main App), which is the daily
 * word game on auibsal.org opened inside Telegram.
 */
export const mainApp = (username: string) =>
  `https://t.me/${username}?startapp`;

const SUPERGROUP_PREFIX = /^-100/;

/** A link to a message in a supergroup (t.me/c/<id>/<thread>/<message>). */
export const messageLink = (
  chatId: number,
  messageId: number,
  threadId?: number
) => {
  const internal = String(chatId).replace(SUPERGROUP_PREFIX, "");
  return threadId
    ? `https://t.me/c/${internal}/${threadId}/${messageId}`
    : `https://t.me/c/${internal}/${messageId}`;
};
