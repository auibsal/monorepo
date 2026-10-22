/**
 * Telegram helpers for apps/api: the bot (on grammY, lib/bot) and the
 * copies of the Nexus notices. Messages use Telegram's HTML
 * formatting; everything we did not write goes through `escapeHtml`.
 */

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};
const HTML_SPECIAL = /[&<>]/g;
const QUOTE = /"/g;
const SAFE_SCHEME = /^(https?|tg):/;
const START_PAYLOAD = /^[\w-]{1,64}$/;

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

export interface InlineButton {
  text: string;
  url: string;
}

export class TelegramError extends Error {
  readonly code: number;
  /** Seconds to wait before retrying (flood control). */
  readonly retryAfter?: number;

  constructor(code: number, description: string, retryAfter?: number) {
    super(`Telegram ${code}: ${description}`);
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

interface ApiResponse<T> {
  description?: string;
  error_code?: number;
  ok: boolean;
  parameters?: { retry_after?: number };
  result?: T;
}

/** One Bot API call without a client library (apps/api's notices). */
export const callTelegram = async <T = unknown>(
  token: string,
  method: string,
  params: Record<string, unknown>,
  fetcher: typeof fetch = fetch
): Promise<T> => {
  const response = await fetcher(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      body: JSON.stringify(params),
      headers: { "content-type": "application/json" },
      method: "POST",
      signal: AbortSignal.timeout(10_000),
    }
  );
  const data = (await response.json()) as ApiResponse<T>;
  if (!data.ok) {
    throw new TelegramError(
      data.error_code ?? response.status,
      data.description ?? "Request failed",
      data.parameters?.retry_after
    );
  }
  return data.result as T;
};

export interface Notice {
  body: string;
  /** The notice's link, shown as a button. */
  button?: InlineButton;
  title: string;
}

/** A notice as one Telegram message: the title in bold, then the text. */
export const noticeMessage = ({ body, button, title }: Notice) => ({
  link_preview_options: { is_disabled: true },
  parse_mode: "HTML",
  reply_markup: button
    ? { inline_keyboard: [[{ text: button.text, url: button.url }]] }
    : undefined,
  text: body
    ? `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(body)}`
    : `<b>${escapeHtml(title)}</b>`,
});
