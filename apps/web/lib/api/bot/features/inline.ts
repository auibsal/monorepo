import { publicEvents } from "@repo/sal-data/events";
import { escapeHtml } from "@repo/telegram";
import { Composer, InlineKeyboard, InlineQueryResultBuilder } from "grammy";
import type { InlineQueryResult } from "grammy/types";
import type { BotContext } from "../context";
import { copy, type Lang } from "../copy";
import { anon } from "../db";
import { pick, when } from "../format";
import { botLink, eventPage, piecePage, web } from "../links";
import { pieceAuthor, publicPieces } from "./waraq";

/**
 * Inline mode: in any chat, "@<bot> poetry" offers the public events and
 * Waraq pieces that match, to share as a card with its buttons. Guest mode:
 * mentioning the bot in a chat it isn't in ("@<bot> open mic") answers there
 * with the best match, or with what's coming up. Guests' reads only (RLS as
 * anon); inline answers are cached by Telegram for five minutes.
 */
export const inline = new Composer<BotContext>();

const MAX_QUERY = 40;
const MENTIONS = /@\w+/g;

const matches = (query: string, ...fields: (string | null)[]) =>
  !query ||
  fields.some((field) => field?.toLowerCase().includes(query.toLowerCase()));

const eventResults = async (lang: Lang, query: string, botUsername: string) => {
  const list = (await publicEvents(anon(), { limit: 20 })) ?? [];
  return list
    .filter((event) => matches(query, event.title_en, event.title_ar))
    .slice(0, 8)
    .map((event) => {
      const title = pick(lang, event.title_en, event.title_ar);
      const summary = pick(lang, event.summary_en, event.summary_ar);
      const venue = pick(lang, event.venue_en, event.venue_ar);
      const text = [
        `<b>${escapeHtml(title)}</b>`,
        when(lang, event.starts_at),
        venue ? escapeHtml(venue) : null,
        summary ? `\n${escapeHtml(summary)}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      const keyboard = new InlineKeyboard()
        .url(copy[lang].buttons.rsvp, botLink(botUsername, `ev_${event.id}`))
        .url(copy[lang].buttons.details, eventPage(lang, event.slug));
      return InlineQueryResultBuilder.article(`e:${event.id}`, title, {
        description: when(lang, event.starts_at),
        reply_markup: keyboard,
      }).text(text, {
        link_preview_options: { is_disabled: true },
        parse_mode: "HTML",
      });
    });
};

const pieceResults = async (lang: Lang, query: string) =>
  (await publicPieces(20))
    .filter((piece) => matches(query, piece.title_en, piece.title_ar))
    .slice(0, 8)
    .map((piece) => {
      const title = pick(lang, piece.title_en, piece.title_ar);
      const author = pieceAuthor(lang, piece);
      const url = piecePage(lang, piece);
      return InlineQueryResultBuilder.article(`p:${piece.id}`, title, {
        description: author || undefined,
        reply_markup: new InlineKeyboard().url(copy[lang].buttons.read, url),
      }).text(
        [`<b>${escapeHtml(title)}</b>`, author ? escapeHtml(author) : null]
          .filter(Boolean)
          .join("\n"),
        { link_preview_options: { url }, parse_mode: "HTML" }
      );
    });

inline.on("inline_query", async (ctx) => {
  // Matched in memory against the latest public items, never sent to SQL.
  const query = ctx.inlineQuery.query.trim().slice(0, MAX_QUERY);
  const { lang } = ctx;
  const [eventsFound, piecesFound] = await Promise.all([
    eventResults(lang, query, ctx.botUsername),
    pieceResults(lang, query),
  ]);
  const results: InlineQueryResult[] = [...eventsFound, ...piecesFound];
  await ctx.answerInlineQuery(results, { cache_time: 300, is_personal: false });
});

const UPCOMING = 5;

/** What's coming up, as one card: the answer when nothing else matches. */
const upcoming = async (lang: Lang) => {
  const t = copy[lang];
  const list = ((await publicEvents(anon(), { limit: UPCOMING })) ?? []).map(
    (event) =>
      `${escapeHtml(pick(lang, event.title_en, event.title_ar))}\n${when(lang, event.starts_at)}`
  );
  return InlineQueryResultBuilder.article("upcoming", t.buttons.events, {
    reply_markup: new InlineKeyboard().url(
      t.buttons.events,
      web(lang, "/events")
    ),
  }).text(list.length ? [t.eventsTitle, ...list].join("\n\n") : t.eventsNone, {
    link_preview_options: { is_disabled: true },
    parse_mode: "HTML",
  });
};

inline.on("guest_message", async (ctx) => {
  const message = ctx.guestMessage;
  const query = (message.text ?? message.caption ?? "")
    .replace(MENTIONS, "")
    .trim()
    .slice(0, MAX_QUERY);
  const { lang } = ctx;
  let best: InlineQueryResult | undefined;
  if (query) {
    const [eventsFound, piecesFound] = await Promise.all([
      eventResults(lang, query, ctx.botUsername),
      pieceResults(lang, query),
    ]);
    best = eventsFound[0] ?? piecesFound[0];
  }
  await ctx.answerGuestQuery(best ?? (await upcoming(lang)));
});
