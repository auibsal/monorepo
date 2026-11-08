/**
 * Telegram helpers for the API routes: the bot (on grammY, lib/bot) and the
 * copies of the Diwan notices. Messages use Telegram's HTML
 * formatting; everything we did not write goes through `escapeHtml`.
 */

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};
const HTML_SPECIAL = /[&<>]/gu;
const QUOTE = /"/gu;
const SAFE_SCHEME = /^(https?|tg):/u;
const START_PAYLOAD = /^[\w-]{1,64}$/u;

/** Escapes text for Telegram's HTML parse mode. */
export const escapeHtml = (text: string) =>
  text.replace(HTML_SPECIAL, (char) => HTML_ESCAPES[char] ?? char);

/** A link in Telegram HTML. Only http(s) and tg: URLs are written out. */
export const link = (href: string, label: string) =>
  SAFE_SCHEME.test(href)
    ? `<a href="${escapeHtml(href).replace(QUOTE, "&quot;")}">${escapeHtml(label)}</a>`
    : escapeHtml(label);

/** The numeric bot id, the part of the token before the colon. */
export const botIdFromToken = (token: string) => Number(token.split(":")[0]);

/**
 * A start link that opens a private chat with the bot and sends
 * `/start <payload>`. Payloads are up to 64 of A–Z, a–z, 0–9, _ and -.
 */
export const startLink = (username: string, payload?: string) => {
  const base = `https://t.me/${username}`;
  if (!payload) {
    return base;
  }
  if (!START_PAYLOAD.test(payload)) {
    throw new Error("Invalid Telegram start payload");
  }
  return `${base}?start=${payload}`;
};

interface InlineButton {
  text: string;
  url: string;
}

export interface Notice {
  body: string;
  /** The notice's link, shown as a button. */
  button?: InlineButton;
  title: string;
}

/** A notice as one Telegram message: the title in bold, then the text. */
export const noticeMessage = ({ body, button, title }: Notice) => ({
  link_preview_options: { is_disabled: true },
  parse_mode: "HTML" as const,
  reply_markup: button
    ? { inline_keyboard: [[{ text: button.text, url: button.url }]] }
    : undefined,
  text: body
    ? `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(body)}`
    : `<b>${escapeHtml(title)}</b>`,
});

/**
 * The account page where a member connects Telegram (HUD-1, HUD-2): the
 * settings panel lives here, Telegram's login returns here, the API route
 * accepts only this address, and Hudhud's "Link my account" opens it.
 * BotFather's redirect list must carry it in both languages.
 */
export const TELEGRAM_LINK_PAGE = "/account/settings/notifications";
