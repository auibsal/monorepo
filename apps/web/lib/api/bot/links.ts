import { apiUrl, siteUrl } from "@repo/internationalization";
import { journal } from "@repo/sal-data";
import { startLink } from "@repo/telegram";
import type { Lang } from "./copy";

/** A public page, in the member's language (English has no prefix). */
export const web = (lang: Lang, path = "") => siteUrl(lang, path || "/");

/** The member's account on the site, in their language. */
export const accountPage = (lang: Lang, path = "") =>
  siteUrl(lang, `/membership${path}`);

export const eventPage = (lang: Lang, slug: string) =>
  web(lang, `/events/${slug}`);

export const piecePage = (
  lang: Lang,
  piece: { readonly desk?: string | null; readonly slug: string }
) => web(lang, journal.piecePath(piece));

export const eventCalendar = (lang: Lang, slug: string) =>
  apiUrl(`/calendar/events/${slug}.ics${lang === "ar" ? "?lang=ar" : ""}`);

export const wordPage = (lang: Lang) => web(lang, "/qirtas/games/word");

export const documentPage = (lang: Lang, slug: string) =>
  web(lang, `/library/${slug}`);

/** Where a member connects Telegram: their profile. */
export const connectPage = (lang: Lang) =>
  accountPage(lang, "/profile#telegram");

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
