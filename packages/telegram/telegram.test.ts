import { describe, expect, it, vi } from "vitest";
import {
  botIdFromToken,
  callTelegram,
  escapeHtml,
  link,
  noticeMessage,
  startLink,
  TelegramError,
} from "./index";

describe("Telegram helpers", () => {
  it("escapes HTML", () => {
    expect(escapeHtml("<b>Tom & Jerry</b>")).toBe(
      "&lt;b&gt;Tom &amp; Jerry&lt;/b&gt;"
    );
  });

  it("writes only web and tg links", () => {
    expect(link("https://auibsal.org/?a=1&b=2", "Site")).toBe(
      '<a href="https://auibsal.org/?a=1&amp;b=2">Site</a>'
    );
    expect(link("javascript:alert(1)", "x")).toBe("x");
  });

  it("reads the bot id from the token", () => {
    expect(botIdFromToken("123456:ABC-def")).toBe(123_456);
  });

  it("builds start links and rejects bad payloads", () => {
    expect(startLink("sal_bot")).toBe("https://t.me/sal_bot");
    expect(startLink("sal_bot", "link_ab12")).toBe(
      "https://t.me/sal_bot?start=link_ab12"
    );
    expect(() => startLink("sal_bot", "a b")).toThrow();
  });

  it("formats a notice", () => {
    const message = noticeMessage({
      body: "See you at 6:00 PM",
      button: { text: "Open", url: "https://auibsal.org/diwan" },
      title: "You're in <3",
    });
    expect(message.text).toBe("<b>You're in &lt;3</b>\n\nSee you at 6:00 PM");
    expect(message.reply_markup?.inline_keyboard[0]?.[0]?.url).toBe(
      "https://auibsal.org/diwan"
    );
  });

  it("raises Telegram errors with the flood wait", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        description: "Too Many Requests",
        error_code: 429,
        ok: false,
        parameters: { retry_after: 3 },
      })
    );
    const error = await callTelegram("1:x", "sendMessage", {}, fetcher).catch(
      (e: unknown) => e
    );
    expect(error).toBeInstanceOf(TelegramError);
    expect((error as TelegramError).retryAfter).toBe(3);
  });
});
